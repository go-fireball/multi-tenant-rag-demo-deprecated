import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from "aws-cdk-lib"
import * as bedrock from "aws-cdk-lib/aws-bedrock"
import * as ec2 from "aws-cdk-lib/aws-ec2"
import * as ecr from "aws-cdk-lib/aws-ecr"
import * as ecs from "aws-cdk-lib/aws-ecs"
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2"
import * as logs from "aws-cdk-lib/aws-logs"
import * as rds from "aws-cdk-lib/aws-rds"
import * as s3 from "aws-cdk-lib/aws-s3"
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager"
import * as ssm from "aws-cdk-lib/aws-ssm"
import { Construct } from "constructs"

import { AuroraSchema } from "./constructs/aurora-schema.js"

export interface SharedStackProps extends StackProps {
  readonly environmentName: string
  readonly databaseName: string
}

const sharedSchemaStatements = [
  "CREATE SCHEMA IF NOT EXISTS app;",
  "CREATE EXTENSION IF NOT EXISTS vector;",
  `
    CREATE TABLE IF NOT EXISTS app.sessions (
      id uuid PRIMARY KEY,
      tenant_id text NOT NULL,
      user_id text NOT NULL,
      title text NOT NULL DEFAULT 'New chat',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS app.messages (
      id uuid PRIMARY KEY,
      tenant_id text NOT NULL,
      session_id uuid NOT NULL REFERENCES app.sessions(id) ON DELETE CASCADE,
      user_id text NOT NULL,
      role text NOT NULL,
      content text NOT NULL,
      citations jsonb NOT NULL DEFAULT '[]'::jsonb,
      attached_files jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS app.session_files (
      file_id uuid PRIMARY KEY,
      tenant_id text NOT NULL,
      session_id uuid NOT NULL REFERENCES app.sessions(id) ON DELETE CASCADE,
      user_id text NOT NULL,
      original_name text NOT NULL,
      sanitized_name text NOT NULL,
      content_type text NOT NULL,
      size_bytes bigint NOT NULL,
      storage_bucket text NOT NULL,
      storage_key text NOT NULL,
      status text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `,
].map((statement) => statement.trim())

export class SharedStack extends Stack {
  public readonly albSecurityGroup: ec2.SecurityGroup
  public readonly attachmentsBucket: s3.Bucket
  public readonly cluster: ecs.Cluster
  public readonly databaseCluster: rds.DatabaseCluster
  public readonly databaseSecret: secretsmanager.ISecret
  public readonly databaseSecurityGroup: ec2.SecurityGroup
  public readonly guardrail: bedrock.CfnGuardrail
  public readonly guardrailVersion: bedrock.CfnGuardrailVersion
  public readonly httpListener: elbv2.ApplicationListener
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer
  public readonly repository: ecr.Repository
  public readonly sharedLogGroup: logs.LogGroup
  public readonly vpc: ec2.Vpc

  constructor(scope: Construct, id: string, props: SharedStackProps) {
    super(scope, id, props)

    this.vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    })

    this.sharedLogGroup = new logs.LogGroup(this, "SharedLogGroup", {
      logGroupName: `/platform/chat/${props.environmentName}/shared`,
      retention: logs.RetentionDays.ONE_WEEK,
    })

    this.cluster = new ecs.Cluster(this, "Cluster", {
      vpc: this.vpc,
      clusterName: `rag-platform-${props.environmentName}`,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    })

    this.albSecurityGroup = new ec2.SecurityGroup(this, "AlbSecurityGroup", {
      vpc: this.vpc,
      description: "Internet-facing ALB security group",
      allowAllOutbound: true,
    })
    this.albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), "Allow public HTTP traffic")

    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, "LoadBalancer", {
      vpc: this.vpc,
      internetFacing: true,
      securityGroup: this.albSecurityGroup,
      loadBalancerName: `rag-${props.environmentName}`,
    })

    this.httpListener = this.loadBalancer.addListener("HttpListener", {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.fixedResponse(404, {
        contentType: "application/json",
        messageBody: JSON.stringify({
          message: "Tenant route not configured",
        }),
      }),
    })

    this.databaseSecurityGroup = new ec2.SecurityGroup(this, "DatabaseSecurityGroup", {
      vpc: this.vpc,
      description: "Aurora security group",
      allowAllOutbound: true,
    })
    this.databaseSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.tcp(5432),
      "Allow Aurora access from private VPC address space",
    )

    this.databaseCluster = new rds.DatabaseCluster(this, "DatabaseCluster", {
      clusterIdentifier: `rag-${props.environmentName}`,
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_4,
      }),
      defaultDatabaseName: props.databaseName,
      writer: rds.ClusterInstance.serverlessV2("writer"),
      readers: [rds.ClusterInstance.serverlessV2("reader", { scaleWithWriter: true })],
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 4,
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [this.databaseSecurityGroup],
      credentials: rds.Credentials.fromGeneratedSecret("app_admin"),
      backup: {
        retention: Duration.days(7),
      },
      enableDataApi: true,
      cloudwatchLogsExports: ["postgresql"],
      cloudwatchLogsRetention: logs.RetentionDays.ONE_WEEK,
      deletionProtection: false,
      removalPolicy: RemovalPolicy.DESTROY,
    })

    if (!this.databaseCluster.secret) {
      throw new Error("Expected generated Aurora secret to be available")
    }
    this.databaseSecret = this.databaseCluster.secret

    new AuroraSchema(this, "SharedSchema", {
      clusterArn: this.databaseCluster.clusterArn,
      secretArn: this.databaseSecret.secretArn,
      databaseName: props.databaseName,
      physicalResourceId: `shared-schema-${props.environmentName}`,
      statements: sharedSchemaStatements,
    })

    this.repository = new ecr.Repository(this, "Repository", {
      repositoryName: `chat-platform-${props.environmentName}`,
      imageScanOnPush: true,
      removalPolicy: RemovalPolicy.DESTROY,
      emptyOnDelete: true,
      lifecycleRules: [
        {
          maxImageCount: 25,
        },
      ],
    })

    this.attachmentsBucket = new s3.Bucket(this, "AttachmentsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
      lifecycleRules: [
        {
          expiration: Duration.days(90),
        },
      ],
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    })

    this.guardrail = new bedrock.CfnGuardrail(this, "Guardrail", {
      name: `tenant-rag-${props.environmentName}`,
      blockedInputMessaging: "Your request could not be processed under the current tenant guardrail policy.",
      blockedOutputsMessaging: "The response was blocked because it was not sufficiently grounded in tenant content.",
      description: "Shared PoC grounding guardrail for tenant-isolated assistants.",
    })

    this.guardrailVersion = new bedrock.CfnGuardrailVersion(this, "GuardrailVersion", {
      guardrailIdentifier: this.guardrail.attrGuardrailId,
      description: `Published version for ${props.environmentName}`,
    })

    new ssm.StringParameter(this, "AlbDnsParameter", {
      parameterName: `/multi-tenant-rag-demo/${props.environmentName}/shared/alb-dns-name`,
      stringValue: this.loadBalancer.loadBalancerDnsName,
    })

    new ssm.StringParameter(this, "RepositoryUriParameter", {
      parameterName: `/multi-tenant-rag-demo/${props.environmentName}/shared/repository-uri`,
      stringValue: this.repository.repositoryUri,
    })

    new ssm.StringParameter(this, "AttachmentsBucketParameter", {
      parameterName: `/multi-tenant-rag-demo/${props.environmentName}/shared/attachments-bucket`,
      stringValue: this.attachmentsBucket.bucketName,
    })

    new CfnOutput(this, "EnvironmentName", {
      value: props.environmentName,
    })

    new CfnOutput(this, "LoadBalancerDnsName", {
      value: this.loadBalancer.loadBalancerDnsName,
    })

    new CfnOutput(this, "SharedAssetsBucketName", {
      value: this.attachmentsBucket.bucketName,
      description: "Shared tenant attachments bucket.",
    })

    new CfnOutput(this, "DatabaseClusterArn", {
      value: this.databaseCluster.clusterArn,
    })

    new CfnOutput(this, "DatabaseSecretArn", {
      value: this.databaseSecret.secretArn,
    })

    new CfnOutput(this, "RepositoryUri", {
      value: this.repository.repositoryUri,
    })
  }
}
