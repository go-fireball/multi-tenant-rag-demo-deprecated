import { Construct } from "constructs"
import * as cdk from "aws-cdk-lib"
import * as iam from "aws-cdk-lib/aws-iam"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as cr from "aws-cdk-lib/custom-resources"

export interface AuroraSchemaProps {
  readonly clusterArn: string
  readonly secretArn: string
  readonly databaseName: string
  readonly statements: string[]
  readonly physicalResourceId: string
}

export class AuroraSchema extends Construct {
  constructor(scope: Construct, id: string, props: AuroraSchemaProps) {
    super(scope, id)

    const handler = new lambda.Function(this, "Handler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      timeout: cdk.Duration.minutes(2),
      code: lambda.Code.fromInline(`
const { RDSDataClient, ExecuteStatementCommand } = require("@aws-sdk/client-rds-data");

const client = new RDSDataClient({});

exports.handler = async (event) => {
  const physicalResourceId =
    event.ResourceProperties.physicalResourceId ||
    event.PhysicalResourceId ||
    event.LogicalResourceId;

  if (event.RequestType === "Delete") {
    return { PhysicalResourceId: physicalResourceId };
  }

  const statements = Array.isArray(event.ResourceProperties.statements)
    ? event.ResourceProperties.statements
    : [];

  for (const statement of statements) {
    const sql = typeof statement === "string" ? statement.trim() : "";

    if (!sql) {
      continue;
    }

    await client.send(new ExecuteStatementCommand({
      resourceArn: event.ResourceProperties.clusterArn,
      secretArn: event.ResourceProperties.secretArn,
      database: event.ResourceProperties.databaseName,
      sql,
    }));
  }

  return { PhysicalResourceId: physicalResourceId };
};
      `),
    })

    handler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["rds-data:ExecuteStatement"],
        resources: [props.clusterArn],
      }),
    )
    handler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: [props.secretArn],
      }),
    )

    const provider = new cr.Provider(this, "Provider", {
      onEventHandler: handler,
    })

    new cdk.CustomResource(this, "Resource", {
      serviceToken: provider.serviceToken,
      properties: {
        clusterArn: props.clusterArn,
        secretArn: props.secretArn,
        databaseName: props.databaseName,
        statements: props.statements,
        physicalResourceId: props.physicalResourceId,
      },
    })
  }
}
