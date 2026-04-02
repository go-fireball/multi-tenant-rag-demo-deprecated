import { App } from "aws-cdk-lib"

import { getEnvironmentConfig } from "../config/tenants.js"
import { SharedStack } from "../lib/shared-stack.js"
import { TenantStack } from "../lib/tenant-stack.js"
import { UIStack } from "../lib/ui-stack.js"

const app = new App()
const environmentName = app.node.tryGetContext("environmentName") ?? "dev"
const environmentConfig = getEnvironmentConfig(environmentName)

const sharedStack = new SharedStack(app, `SharedStack-${environmentConfig.environmentName}`, {
  description: "Shared platform baseline for the multi-tenant RAG demo",
  environmentName: environmentConfig.environmentName,
  databaseName: environmentConfig.databaseName,
})

for (const tenant of environmentConfig.tenants) {
  const tenantStack = new TenantStack(
    app,
    `TenantStack-${tenant.tenantId}-${environmentConfig.environmentName}`,
    {
      description: `Tenant-isolated Bedrock and document resources for ${tenant.tenantId}`,
      environmentName: environmentConfig.environmentName,
      databaseName: environmentConfig.databaseName,
      tenant,
      shared: sharedStack,
    },
  )

  new UIStack(app, `UIStack-${tenant.tenantId}-${environmentConfig.environmentName}`, {
    description: `Tenant UI service for ${tenant.tenantId}`,
    environmentName: environmentConfig.environmentName,
    tenant,
    shared: sharedStack,
    tenantResources: tenantStack,
  })
}
