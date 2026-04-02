import {process} from "std-env";

export function getTenantId() {
  return process.env.TENANT_ID?.trim()
    || useRuntimeConfig().tenantId
}
