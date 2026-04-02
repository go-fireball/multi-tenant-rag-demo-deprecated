import {process} from "std-env";

export default defineNuxtConfig({
  compatibilityDate: "2026-04-01",
  devtools: { enabled: true },
  srcDir: ".",
  future: {
    compatibilityVersion: 4,
  },
  runtimeConfig: {
    tenantId: process.env.TENANT_ID ?? process.env.NUXT_TENANT_ID ?? "local-dev",
    public: {
      tenantId: process.env.NUXT_PUBLIC_TENANT_ID ?? "local-dev",
    },
  },
})
