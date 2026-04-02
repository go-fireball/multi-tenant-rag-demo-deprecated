import { CfnOutput, Stack, type StackProps } from "aws-cdk-lib"
import { Construct } from "constructs"

export interface SharedStackProps extends StackProps {
  environmentName: string
}

export class SharedStack extends Stack {
  public readonly sharedAssetsBucketName: string

  constructor(scope: Construct, id: string, props: SharedStackProps) {
    super(scope, id, props)

    this.sharedAssetsBucketName = `placeholder-shared-assets-${props.environmentName}`

    new CfnOutput(this, "EnvironmentName", {
      value: props.environmentName,
    })

    new CfnOutput(this, "SharedAssetsBucketName", {
      value: this.sharedAssetsBucketName,
      description: "Placeholder output until real shared infrastructure is added.",
    })
  }
}
