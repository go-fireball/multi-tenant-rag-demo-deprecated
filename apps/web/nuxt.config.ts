export default defineNuxtConfig({
  compatibilityDate: "2026-04-01",
  devtools: { enabled: true },
  srcDir: ".",
  future: {
    compatibilityVersion: 4,
  },
  runtimeConfig: {
    public: {
      tenantId: process.env.NUXT_PUBLIC_TENANT_ID ?? "local-dev",
    },
  },
})
