<script setup lang="ts">
const config = useRuntimeConfig()
</script>

<template>
  <main class="shell">
    <section class="panel">
      <p class="eyebrow">Multi-Tenant RAG Demo</p>
      <h1>Nuxt baseline is wired.</h1>
      <p class="body">
        This slice intentionally stops at the scaffold. Chat, uploads, auth, Aurora,
        and Bedrock integrations are deferred to later items.
      </p>
      <p class="tenant">Tenant: {{ config.public.tenantId }}</p>
    </section>
  </main>
</template>

<style scoped>
:global(body) {
  margin: 0;
  font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
  background:
    radial-gradient(circle at top, #f2efe8 0%, #e7dfd2 30%, #d6ccb8 100%);
  color: #1d1b19;
}

.shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
}

.panel {
  width: min(42rem, 100%);
  padding: 2rem;
  border: 1px solid rgba(29, 27, 25, 0.12);
  border-radius: 1.5rem;
  background: rgba(255, 252, 246, 0.84);
  box-shadow: 0 20px 60px rgba(76, 62, 44, 0.14);
  backdrop-filter: blur(10px);
}

.eyebrow {
  margin: 0 0 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.75rem;
  color: #7b5b2e;
}

h1 {
  margin: 0;
  font-size: clamp(2.5rem, 5vw, 3.75rem);
  line-height: 0.95;
}

.body,
.tenant {
  margin: 1.25rem 0 0;
  font-size: 1rem;
  line-height: 1.6;
}

.tenant {
  font-weight: 600;
}
</style>
