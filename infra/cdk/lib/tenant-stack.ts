import { CfnOutput, Stack, type StackProps } from "aws-cdk-lib"
import { Construct } from "constructs"

export interface TenantStackProps extends StackProps {
  environmentName: string
  tenantId: string
  sharedAssetsBucketName: string
}

export class TenantStack extends Stack {
  constructor(scope: Construct, id: string, props: TenantStackProps) {
    super(scope, id, props)

    new CfnOutput(this, "TenantId", {
      value: props.tenantId,
    })

    new CfnOutput(this, "EnvironmentName", {
      value: props.environmentName,
    })

    new CfnOutput(this, "SharedAssetsBucketName", {
      value: props.sharedAssetsBucketName,
      description: "Reference to shared placeholder infrastructure.",
    })

    new CfnOutput(this, "PlannedResources", {
      value: [
        "Nuxt service on ECS Fargate",
        "Tenant-scoped Bedrock Agent",
        "Tenant-scoped Bedrock Knowledge Base",
      ].join(", "),
      description: "Intent-only output for the scaffold slice.",
    })
  }
}
