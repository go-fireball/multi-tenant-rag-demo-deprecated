# Next Agent

Active item: `ITEM-0001` is the repo baseline scaffold.

What needs judgment now:
- Treat `ai/goal.yaml` and `ai/prd.yaml` as authoritative over the generic template defaults in `ai/judgment.yaml`.
- Confirm the repo layout should be normalized to `apps/web` for Nuxt 4 and `infra/cdk` for the TypeScript CDK app.
- Confirm the first slice stays narrow: root workspace setup, shared TypeScript/configuration, minimal Nuxt entrypoints, and placeholder CDK app/stack wiring only.
- Verify that introducing a separate backend service, real API feature work, Aurora wiring, upload handling, or Bedrock integration in this item would be scope creep.

What the following ENGINEER handoff should enable:
- Create the baseline files and scripts needed for later session/chat/upload/CDK work without re-deciding stack or layout.
- Preserve the modular-monolith constraint and avoid any separate backend service or unnecessary abstraction layers.
