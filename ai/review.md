# Review Notes

Use this file for reviewer outcomes:

- **DONE**: item accepted and loop returns to PLANNER for next item.
- **REVISE**: route back to specific role with explicit gap list.
- **ESCALATE**: WAITING FOR USER only for approved escalation categories.

## 2026-04-01 SENIOR_JUDGMENTAL_ENGINEER

- **DONE**: `ITEM-0001` is approved to proceed to engineering as a scaffold-only implementation slice.
- Project-specific sources (`ai/goal.yaml`, `ai/prd.yaml`, `ai/decision-lock.yaml`) override the generic defaults in `ai/judgment.yaml`. The stack is Nuxt 4 plus Nitro server routes, TypeScript CDK, AWS Fargate, Aurora PostgreSQL, and Google OAuth as the preferred PoC auth path.
- `ai/requirements.md` is still template-grade and should not be treated as authoritative for this item. ENGINEER must follow the locked decisions and active item scope instead of inheriting placeholder text.
- The correct engineering target is a minimal monorepo baseline only: root workspace setup, shared TS config, `apps/web` Nuxt entrypoints, and `infra/cdk` placeholder app/stack wiring.
- Reject scope creep in this slice: no separate backend service, no real API feature work, no Aurora schema or client integration, no Bedrock integration, no upload implementation, and no production-hardening work.

## 2026-04-01 ENGINEER

- **REVISE**: `ITEM-0001` cannot be implemented under the current engineer edit contract without violating `ai/prompts/02-engineer.md`.
- The item's accepted scope explicitly requires a root workspace package manager setup and shared TypeScript config, but the engineer prompt only permits edits under `apps/**`, `infra/**`, selected `ai/**`, and related tests/docs.
- The repo currently has no root `package.json`, lockfile, or shared `tsconfig`, so implementation would require root-level file creation.
- Judgment should either expand the allowed edit list for ENGINEER to include the required root workspace/config files or narrow the item scope to fit the current contract.

## 2026-04-01 SENIOR_JUDGMENTAL_ENGINEER

- **ESCALATE**: the active-item scope and the engineer role contract are still mutually inconsistent, and this role cannot repair that mismatch within its allowed edit set.
- `ITEM-0001`, `ai/simplification.md`, and `ai/decision-lock.yaml` correctly insist on a root `npm` workspace plus shared TypeScript config for the baseline scaffold.
- `ai/prompts/02-engineer.md` still forbids those root-level edits, and this role is not permitted to modify prompt contracts or the active-item definition directly.
- A user-level decision is required: either permit the engineer prompt to include the minimum root workspace/config files, or re-scope the item so the scaffold no longer requires them.

## 2026-04-01 SENIOR_JUDGMENTAL_ENGINEER

- **DONE**: the user resolved the contract conflict by choosing `rescope_item_0001`, so implementation should continue without any root-level workspace/config work in this slice.
- Treat the human answer as authoritative over the earlier scaffold language: ENGINEER should build only what fits inside `apps/**` and `infra/**` plus already-allowed baton artifacts.
- The revised implementation target is a lean baseline with `apps/web` Nuxt entrypoints and `infra/cdk` placeholder stack/app wiring only. If either subtree needs local config files, keep them inside those directories.
- Reject any attempt to recreate the old blocked scope through root `package.json`, shared root `tsconfig`, or other repo-top workspace bootstrap files. That work is explicitly deferred, not accidentally omitted.
- `ai/requirements.md` remains template-grade and non-authoritative. ENGINEER should follow the locked decisions, the human rescope answer, and this review note instead.

## 2026-04-01 ENGINEER

- Implemented the re-scoped `ITEM-0001` baseline entirely inside the allowed edit boundary.
- Added `apps/web` with an app-local `package.json`, `nuxt.config.ts`, local `tsconfig.json`, a minimal `app/app.vue`, and a placeholder Nitro route at `server/api/health.get.ts`.
- Added `infra/cdk` with an app-local `package.json`, `tsconfig.json`, `cdk.json`, and placeholder TypeScript CDK wiring across `bin/app.ts`, `lib/shared-stack.ts`, and `lib/tenant-stack.ts`.
- The CDK scaffold proves shared-versus-tenant stack shape using outputs only; no real AWS resources, runtime integration, or deployment logic were added.
- Validation caveat: dependencies were not installed and no `nuxt build`, `tsc`, or `cdk synth` command was run in this slice because the repo still intentionally lacks any root workspace/bootstrap setup and the new package manifests are dependency-only scaffolds.

## 2026-04-01 VALIDATOR

- **REVISE**: the slice is structurally aligned with the re-scoped item, but `infra/cdk` is not yet self-consistent enough to accept as a usable baseline.
- `infra/cdk/package.json:8` defines `synth` as `cdk synth`, while `infra/cdk/cdk.json:2` points CDK at `dist/bin/app.js`. In a clean checkout, `dist/` does not exist until `npm run build` is executed, so the advertised synth entrypoint fails by construction instead of synthesizing the placeholder stacks in `infra/cdk/bin/app.ts`.
- This is a concrete implementation defect, not a planning ambiguity. Keep the current scope, but fix the CDK app so its primary synth workflow works without a hidden manual pre-step or explicitly wires that pre-step into the script path.
- Structural checks that passed: implementation stayed inside `apps/**`, `infra/**`, and allowed baton files; `apps/web` is a minimal Nuxt 4 plus Nitro scaffold; `infra/cdk` remains placeholder-only and does not introduce deferred chat, upload, auth, Aurora, Bedrock, or production-resource scope.
- Verification performed in validation was static only. No dependency installation or runtime build/synth execution was done because this role is restricted to baton-file edits, so the failure above is derived directly from the checked-in script/config contract.

## 2026-04-01 ENGINEER

- Updated `infra/cdk/package.json` so `npm run synth` now runs `npm run build && cdk synth`, making the primary synth workflow explicit and self-contained from a clean checkout.
- Left `cdk.json` pointing at `dist/bin/app.js`; the hidden prebuild requirement is now encoded in the advertised synth path instead of being implicit.
- Verification performed: from `infra/cdk`, removed `dist/` and ran `npm run synth` successfully. CDK synthesized `SharedStack-dev` and `TenantStack-tenant-a-dev` into `infra/cdk/cdk.out`.

## 2026-04-01 VALIDATOR

- **DONE**: `ITEM-0001` now satisfies the re-scoped scaffold acceptance boundary and can return to `PLANNER`.
- Validation confirmed the implementation remains inside `apps/**` and `infra/**`, with `apps/web` limited to a minimal Nuxt 4 plus Nitro scaffold and `infra/cdk` limited to placeholder CDK app/stack wiring only.
- The previous CDK defect is resolved: `infra/cdk/package.json` now makes `npm run synth` self-contained by building before synth, matching `infra/cdk/cdk.json` and succeeding from the local package.
- Verification performed in validation:
  - `cd apps/web && npm run build` succeeded.
  - `cd infra/cdk && npm run synth` succeeded and synthesized `SharedStack-dev` plus `TenantStack-tenant-a-dev`.
- No deferred scope was introduced in the checked source files: no root workspace bootstrap, no separate backend service, no Lambda app logic, no real AWS resource implementation, and no chat, upload, Aurora, Bedrock, or auth feature work.

## 2026-04-02 SENIOR_JUDGMENTAL_ENGINEER

- **DONE**: `ITEM-0002` is ready for engineering without user escalation.
- The planner’s scope is correct and sufficiently narrow: implement only the first chat vertical in `apps/web`, with Nuxt server routes as the sole backend boundary and no new root-workspace or CDK work.
- Treat `ai/requirements.md` as non-authoritative template residue again. The real source of truth is `ai/goal.yaml`, `ai/prd.yaml`, `ai/active_item.yaml`, and the decision locks below.
- Required implementation shape:
  - A tenant-scoped session/message persistence seam that is Aurora-compatible in data shape and ownership rules.
  - Session creation/listing or loading routes sufficient to support a usable chat screen and message history reload.
  - A `POST` chat route that streams response chunks via the locked `fetch` plus `ReadableStream` pattern.
  - Tenant identity derived only from server runtime config or environment, never from request body, query string, or client-controlled headers.
- Acceptable simplifications:
  - A local/dev repository or adapter may back the persistence seam if the contract remains Aurora-shaped and tenant-scoped.
  - The assistant response path may use a thin adapter or deterministic stub so long as the route contract preserves future Bedrock-backed grounded responses.
- Reject scope creep:
  - No upload endpoints or file metadata flow.
  - No OAuth completion or auth-system expansion beyond existing fallback assumptions.
  - No production Aurora pooling, migrations, or infra wiring disguised as "needed for realism."
  - No EventSource-only streaming design; this item is explicitly `POST` request streaming.
