import { getTenantId } from "../utils/tenant"

export default defineEventHandler(() => {
  return {
    ok: true,
    service: "web",
    tenantId: getTenantId(),
    timestamp: new Date().toISOString(),
  }
})
