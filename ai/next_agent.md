# Next Agent

Active item: `ITEM-0001` is the repo baseline scaffold.

What needs judgment now:
- Treat `ai/goal.yaml` and `ai/prd.yaml` as authoritative over the generic template defaults in `ai/judgment.yaml`.
- Confirm the implementation should start with a lean Nuxt 4 app workspace plus TypeScript CDK workspace under `apps/` and `infra/`.
- Keep the first slice narrow: baseline structure, shared configuration, and minimal app/infra entrypoints only. Do not jump ahead to full chat, upload, or Bedrock integration in this item.

What the following ENGINEER handoff should enable:
- Create the repo structure and baseline files needed for later session/chat/upload/CDK work.
- Preserve the modular-monolith constraint and avoid any separate backend service or unnecessary abstraction layers.
