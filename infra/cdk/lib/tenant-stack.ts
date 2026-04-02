import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  SecretValue,
  Stack,
  type StackProps,
} from "aws-cdk-lib"
import * as bedrock from "aws-cdk-lib/aws-bedrock"
import * as iam from "aws-cdk-lib/aws-iam"
import * as logs from "aws-cdk-lib/aws-logs"
import * as scheduler from "aws-cdk-lib/aws-scheduler"
import * as schedulerTargets from "aws-cdk-lib/aws-scheduler-targets"
import * as s3 from "aws-cdk-lib/aws-s3"
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager"
import { Construct } from "constructs"

import type { TenantDefinition } from "../config/tenants.js"
import { AuroraSchema } from "./constructs/aurora-schema.js"
import type { SharedStack } from "./shared-stack.js"

export interface TenantStackProps extends StackProps {
  readonly environmentName: string
  readonly databaseName: string
  readonly tenant: TenantDefinition
  readonly shared: SharedStack
}

const kbTableNameForTenant = (tenantId: string): string => `vectors_${tenantId.replace(/-/g, "_")}.bedrock_kb`

const tenantSchemaStatements = (tenantId: string): string[] => {
  const schemaName = `vectors_${tenantId.replace(/-/g, "_")}`
  const tableName = kbTableNameForTenant(tenantId)
  const indexName = `${tenantId.replace(/-/g, "_")}_bedrock_kb_embedding_idx`

  return [
    `CREATE SCHEMA IF NOT EXISTS ${schemaName};`,
    "CREATE EXTENSION IF NOT EXISTS vector;",
    `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id uuid PRIMARY KEY,
        embedding vector(1024),
        chunks text NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        custom_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
      );
    `,
    `
      CREATE INDEX IF NOT EXISTS ${indexName}
      ON ${tableName} USING hnsw (embedding vector_cosine_ops);
    `,
  ].map((statement) => statement.trim())
}

export class TenantStack extends Stack {
  public readonly agent: bedrock.CfnAgent
  public readonly agentAlias: bedrock.CfnAgentAlias
  public readonly dataSource: bedrock.CfnDataSource
  public readonly docsBucket: s3.Bucket
  public readonly knowledgeBase: bedrock.CfnKnowledgeBase
  public readonly runtimeSecret: secretsmanager.Secret

  constructor(scope: Construct, id: string, props: TenantStackProps) {
    super(scope, id, props)

    const tenantLogGroup = new logs.LogGroup(this, "TenantLogGroup", {
      logGroupName: `/platform/tenant/${props.environmentName}/${props.tenant.tenantId}`,
      retention: logs.RetentionDays.ONE_WEEK,
    })

    this.docsBucket = new s3.Bucket(this, "DocsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    })

    const tableName = kbTableNameForTenant(props.tenant.tenantId)

    const tenantSchema = new AuroraSchema(this, "TenantSchema", {
      clusterArn: props.shared.databaseCluster.clusterArn,
      secretArn: props.shared.databaseSecret.secretArn,
      databaseName: props.databaseName,
      physicalResourceId: `tenant-schema-${props.tenant.tenantId}-${props.environmentName}`,
      statements: tenantSchemaStatements(props.tenant.tenantId),
    })

    const knowledgeBaseRole = new iam.Role(this, "KnowledgeBaseRole", {
      assumedBy: new iam.ServicePrincipal("bedrock.amazonaws.com"),
      description: `Bedrock knowledge base role for ${props.tenant.tenantId}`,
    })

    this.docsBucket.grantRead(knowledgeBaseRole)
    props.shared.databaseSecret.grantRead(knowledgeBaseRole)
    props.shared.databaseCluster.grantDataApiAccess(knowledgeBaseRole)

    knowledgeBaseRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: [
          `arn:${this.partition}:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`,
        ],
      }),
    )

    const agentRole = new iam.Role(this, "AgentRole", {
      assumedBy: new iam.ServicePrincipal("bedrock.amazonaws.com"),
      description: `Bedrock agent role for ${props.tenant.tenantId}`,
    })

    props.shared.attachmentsBucket.grantRead(agentRole, `${props.tenant.tenantId}/*`)
    agentRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:Retrieve", "bedrock:RetrieveAndGenerate"],
        resources: ["*"],
      }),
    )

    this.knowledgeBase = new bedrock.CfnKnowledgeBase(this, "KnowledgeBase", {
      name: `${props.tenant.tenantId}-kb-${props.environmentName}`,
      description: `Tenant-isolated knowledge base for ${props.tenant.displayName}`,
      roleArn: knowledgeBaseRole.roleArn,
      knowledgeBaseConfiguration: {
        type: "VECTOR",
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: `arn:${this.partition}:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`,
          embeddingModelConfiguration: {
            bedrockEmbeddingModelConfiguration: {
              dimensions: 1024,
              embeddingDataType: "FLOAT32",
            },
          },
        },
      },
      storageConfiguration: {
        type: "RDS",
        rdsConfiguration: {
          credentialsSecretArn: props.shared.databaseSecret.secretArn,
          databaseName: props.databaseName,
          resourceArn: props.shared.databaseCluster.clusterArn,
          tableName,
          fieldMapping: {
            primaryKeyField: "id",
            vectorField: "embedding",
            textField: "chunks",
            metadataField: "metadata",
            customMetadataField: "custom_metadata",
          },
        },
      },
      tags: {
        Environment: props.environmentName,
        TenantId: props.tenant.tenantId,
      },
    })
    this.knowledgeBase.node.addDependency(tenantSchema)

    this.dataSource = new bedrock.CfnDataSource(this, "DataSource", {
      knowledgeBaseId: this.knowledgeBase.attrKnowledgeBaseId,
      name: `${props.tenant.tenantId}-docs`,
      description: `S3 document source for ${props.tenant.displayName}`,
      dataDeletionPolicy: "RETAIN",
      dataSourceConfiguration: {
        type: "S3",
        s3Configuration: {
          bucketArn: this.docsBucket.bucketArn,
          inclusionPrefixes: ["documents/"],
        },
      },
    })

    this.agent = new bedrock.CfnAgent(this, "Agent", {
      agentName: `${props.tenant.tenantId}-agent-${props.environmentName}`,
      description: `Tenant-isolated assistant for ${props.tenant.displayName}`,
      autoPrepare: true,
      foundationModel: "anthropic.claude-3-haiku-20240307-v1:0",
      agentResourceRoleArn: agentRole.roleArn,
      idleSessionTtlInSeconds: 3600,
      instruction: [
        `You are the assistant for ${props.tenant.displayName}.`,
        "Answer using only tenant-approved knowledge-base and uploaded-session content.",
        "If the tenant knowledge base cannot answer the question, say so directly instead of guessing.",
      ].join(" "),
      knowledgeBases: [
        {
          description: `Primary knowledge base for ${props.tenant.displayName}`,
          knowledgeBaseId: this.knowledgeBase.attrKnowledgeBaseId,
          knowledgeBaseState: "ENABLED",
        },
      ],
      tags: {
        Environment: props.environmentName,
        TenantId: props.tenant.tenantId,
      },
    })

    this.agentAlias = new bedrock.CfnAgentAlias(this, "AgentAlias", {
      agentAliasName: `${props.tenant.tenantId}-agent-alias-${props.environmentName}`,
      agentId: this.agent.attrAgentId,
      description: `Primary alias for ${props.tenant.displayName}`,
      routingConfiguration: [
        {
          agentVersion: this.agent.attrAgentVersion,
        },
      ],
      tags: {
        Environment: props.environmentName,
        TenantId: props.tenant.tenantId,
      },
    })

    new scheduler.Schedule(this, "IngestionSchedule", {
      description: `Daily KB sync for ${props.tenant.tenantId}`,
      enabled: true,
      schedule: scheduler.ScheduleExpression.rate(Duration.days(1)),
      timeWindow: scheduler.TimeWindow.off(),
      target: new schedulerTargets.Universal({
        service: "bedrockagent",
        action: "startIngestionJob",
        input: scheduler.ScheduleTargetInput.fromObject({
          knowledgeBaseId: this.knowledgeBase.attrKnowledgeBaseId,
          dataSourceId: this.dataSource.attrDataSourceId,
        }),
        policyStatements: [
          new iam.PolicyStatement({
            actions: ["bedrock:StartIngestionJob"],
            resources: ["*"],
          }),
        ],
      }),
    })

    this.runtimeSecret = new secretsmanager.Secret(this, "RuntimeSecret", {
      secretName: `multi-tenant-rag-demo/${props.environmentName}/${props.tenant.tenantId}/runtime`,
      description: `Tenant runtime config for ${props.tenant.tenantId}`,
      secretObjectValue: {
        agentAliasId: SecretValue.unsafePlainText(this.agentAlias.attrAgentAliasId),
        agentId: SecretValue.unsafePlainText(this.agent.attrAgentId),
        docsBucketName: SecretValue.unsafePlainText(this.docsBucket.bucketName),
        guardrailId: SecretValue.unsafePlainText(props.shared.guardrail.attrGuardrailId),
        guardrailVersion: SecretValue.unsafePlainText(props.shared.guardrailVersion.attrVersion),
        knowledgeBaseId: SecretValue.unsafePlainText(this.knowledgeBase.attrKnowledgeBaseId),
        tenantDisplayName: SecretValue.unsafePlainText(props.tenant.displayName),
        tenantId: SecretValue.unsafePlainText(props.tenant.tenantId),
      },
      removalPolicy: RemovalPolicy.DESTROY,
    })

    new CfnOutput(this, "TenantId", {
      value: props.tenant.tenantId,
    })

    new CfnOutput(this, "KnowledgeBaseId", {
      value: this.knowledgeBase.attrKnowledgeBaseId,
    })

    new CfnOutput(this, "AgentId", {
      value: this.agent.attrAgentId,
    })

    new CfnOutput(this, "AgentAliasId", {
      value: this.agentAlias.attrAgentAliasId,
    })

    new CfnOutput(this, "DocsBucketName", {
      value: this.docsBucket.bucketName,
    })

    new CfnOutput(this, "TenantLogGroupName", {
      value: tenantLogGroup.logGroupName,
    })
  }
}
