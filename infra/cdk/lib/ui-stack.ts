import {
  CfnOutput,
  Duration,
  Stack,
  type StackProps,
} from "aws-cdk-lib"
import * as ec2 from "aws-cdk-lib/aws-ec2"
import * as ecs from "aws-cdk-lib/aws-ecs"
import * as iam from "aws-cdk-lib/aws-iam"
import * as logs from "aws-cdk-lib/aws-logs"
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2"
import { Construct } from "constructs"
import { fileURLToPath } from "node:url"

import type { TenantDefinition } from "../config/tenants.js"
import type { SharedStack } from "./shared-stack.js"
import type { TenantStack } from "./tenant-stack.js"

export interface UIStackProps extends StackProps {
  readonly environmentName: string
  readonly tenant: TenantDefinition
  readonly shared: SharedStack
  readonly tenantResources: TenantStack
}

const webAppDirectory = fileURLToPath(new URL("../../../../apps/web", import.meta.url))

export class UIStack extends Stack {
  constructor(scope: Construct, id: string, props: UIStackProps) {
    super(scope, id, props)

    const serviceSecurityGroup = new ec2.SecurityGroup(this, "ServiceSecurityGroup", {
      vpc: props.shared.vpc,
      description: `Application security group for ${props.tenant.tenantId}`,
      allowAllOutbound: true,
    })

    serviceSecurityGroup.addIngressRule(
      props.shared.albSecurityGroup,
      ec2.Port.tcp(3000),
      `Allow ALB traffic for ${props.tenant.tenantId}`,
    )

    const logGroup = new logs.LogGroup(this, "UiLogGroup", {
      logGroupName: `/platform/chat-ui/${props.environmentName}/${props.tenant.tenantId}`,
      retention: logs.RetentionDays.ONE_WEEK,
    })

    const taskRole = new iam.Role(this, "TaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      description: `Application task role for ${props.tenant.tenantId}`,
    })

    const executionRole = new iam.Role(this, "ExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      description: `Execution role for ${props.tenant.tenantId}`,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy"),
      ],
    })

    const taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDefinition", {
      cpu: 512,
      memoryLimitMiB: 1024,
      taskRole,
      executionRole,
      runtimePlatform: {
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
      },
    })

    props.shared.repository.grantPull(executionRole)
    props.shared.databaseSecret.grantRead(executionRole)
    props.tenantResources.runtimeSecret.grantRead(executionRole)

    props.shared.databaseSecret.grantRead(taskRole)
    props.tenantResources.runtimeSecret.grantRead(taskRole)

    taskDefinition.addContainer("Web", {
      image: ecs.ContainerImage.fromAsset(webAppDirectory),
      containerName: "web",
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: props.tenant.tenantId,
        logGroup,
      }),
      portMappings: [
        {
          containerPort: 3000,
          protocol: ecs.Protocol.TCP,
        },
      ],
      environment: {
        AWS_REGION: this.region,
        HOST: "0.0.0.0",
        NODE_ENV: "production",
        NUXT_PUBLIC_TENANT_ID: props.tenant.tenantId,
        NUXT_PUBLIC_TENANT_NAME: props.tenant.displayName,
        NUXT_TENANT_ID: props.tenant.tenantId,
        PORT: "3000",
        TENANT_ID: props.tenant.tenantId,
      },
      secrets: {
        BEDROCK_AGENT_ALIAS_ID: ecs.Secret.fromSecretsManager(props.tenantResources.runtimeSecret, "agentAliasId"),
        BEDROCK_AGENT_ID: ecs.Secret.fromSecretsManager(props.tenantResources.runtimeSecret, "agentId"),
        BEDROCK_GUARDRAIL_ID: ecs.Secret.fromSecretsManager(props.tenantResources.runtimeSecret, "guardrailId"),
        BEDROCK_GUARDRAIL_VERSION: ecs.Secret.fromSecretsManager(props.tenantResources.runtimeSecret, "guardrailVersion"),
        BEDROCK_KNOWLEDGE_BASE_ID: ecs.Secret.fromSecretsManager(props.tenantResources.runtimeSecret, "knowledgeBaseId"),
        DATABASE_HOST: ecs.Secret.fromSecretsManager(props.shared.databaseSecret, "host"),
        DATABASE_NAME: ecs.Secret.fromSecretsManager(props.shared.databaseSecret, "dbname"),
        DATABASE_PASSWORD: ecs.Secret.fromSecretsManager(props.shared.databaseSecret, "password"),
        DATABASE_PORT: ecs.Secret.fromSecretsManager(props.shared.databaseSecret, "port"),
        DATABASE_USER: ecs.Secret.fromSecretsManager(props.shared.databaseSecret, "username"),
        DOCS_BUCKET_NAME: ecs.Secret.fromSecretsManager(props.tenantResources.runtimeSecret, "docsBucketName"),
      },
    })

    const service = new ecs.FargateService(this, "Service", {
      cluster: props.shared.cluster,
      taskDefinition,
      desiredCount: 1,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      assignPublicIp: false,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [serviceSecurityGroup],
      circuitBreaker: {
        rollback: true,
      },
    })

    props.shared.httpListener.addTargets(`TenantTraffic${props.tenant.tenantId}`, {
      priority: props.tenant.listenerPriority,
      conditions: [elbv2.ListenerCondition.hostHeaders(props.tenant.hostnames)],
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service],
      healthCheck: {
        enabled: true,
        path: "/api/health",
        healthyHttpCodes: "200",
        interval: Duration.seconds(30),
      },
    })

    new CfnOutput(this, "TenantId", {
      value: props.tenant.tenantId,
    })

    new CfnOutput(this, "ServiceName", {
      value: service.serviceName,
    })

    new CfnOutput(this, "Hostnames", {
      value: props.tenant.hostnames.join(","),
    })
  }
}
