# Next Agent

Active item: `ITEM-0001` remains the repo baseline scaffold and is ready for judgment.

Judgment focus:
- Use `ai/goal.yaml` and `ai/prd.yaml` as the source of truth for stack and scope.
- Confirm the repo should be a root workspace with `apps/web` for Nuxt 4 and `infra/cdk` for the TypeScript CDK app.
- Confirm this slice is limited to shared workspace/config setup, minimal Nuxt runtime entrypoints, and placeholder CDK app/stack wiring.
- Reject scope creep in this item: no separate backend service, no real chat or upload routes, no Aurora wiring, no Bedrock integration, and no detailed production infra buildout.

What ENGINEER should receive after judgment:
- A narrow implementation brief to scaffold the monorepo baseline only.
- Clear permission to create placeholder runtime and infra entrypoints that future items can extend without revisiting core architecture decisions.
