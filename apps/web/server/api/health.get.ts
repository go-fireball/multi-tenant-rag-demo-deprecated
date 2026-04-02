export default defineEventHandler(() => {
  return {
    ok: true,
    service: "web",
    tenantId: useRuntimeConfig().public.tenantId,
    timestamp: new Date().toISOString(),
  }
})
