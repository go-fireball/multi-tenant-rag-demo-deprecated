import { App } from "aws-cdk-lib"

import { SharedStack } from "../lib/shared-stack.js"
import { TenantStack } from "../lib/tenant-stack.js"

const app = new App()
const environmentName = app.node.tryGetContext("environmentName") ?? "dev"
const tenantId = app.node.tryGetContext("tenantId") ?? "tenant-a"

const sharedStack = new SharedStack(app, `SharedStack-${environmentName}`, {
  description: "Shared platform placeholder stack for the multi-tenant RAG demo",
  environmentName,
})

new TenantStack(app, `TenantStack-${tenantId}-${environmentName}`, {
  description: "Tenant-scoped placeholder stack for the multi-tenant RAG demo",
  environmentName,
  tenantId,
  sharedAssetsBucketName: sharedStack.sharedAssetsBucketName,
})
