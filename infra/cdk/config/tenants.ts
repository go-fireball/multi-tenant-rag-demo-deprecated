export interface TenantDefinition {
  readonly tenantId: string
  readonly displayName: string
  readonly hostnames: string[]
  readonly listenerPriority: number
}

export interface EnvironmentConfig {
  readonly environmentName: string
  readonly baseDomain: string
  readonly databaseName: string
  readonly tenants: TenantDefinition[]
}

const createTenants = (baseDomain: string): TenantDefinition[] => {
  return [
    {
      tenantId: "tenant-a",
      displayName: "Tenant A",
      hostnames: [`tenant-a.${baseDomain}`],
      listenerPriority: 100,
    },
    {
      tenantId: "tenant-b",
      displayName: "Tenant B",
      hostnames: [`tenant-b.${baseDomain}`],
      listenerPriority: 110,
    },
  ]
}

export const getEnvironmentConfig = (environmentName: string): EnvironmentConfig => {
  const normalizedEnvironment = environmentName.trim() || "dev"
  const baseDomain = `${normalizedEnvironment}.platform.local`

  return {
    environmentName: normalizedEnvironment,
    baseDomain,
    databaseName: "ragplatform",
    tenants: createTenants(baseDomain),
  }
}
