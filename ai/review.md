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

## 2026-04-02 SENIOR_JUDGMENTAL_ENGINEER

- **DONE**: `ITEM-0003` is ready for engineering without user escalation.
- The scope is clear enough already; the risk is implementation drift, not missing product direction.
- `ai/requirements.md` is still template residue and should be ignored for this slice. Use `ai/goal.yaml`, `ai/prd.yaml`, `ai/active_item.yaml`, and `ai/decision-lock.yaml` as the real contract.
- Required implementation shape:
  - Add a tenant-scoped multipart `POST /api/files` route in `apps/web` that validates request-level file count, per-file size, session-level quota, MIME type, and session ownership before persisting anything.
  - Extend the existing Aurora-shaped persistence seam with `session_files` records and explicit lookup/link operations instead of creating a disconnected upload path.
  - Add a replaceable object-storage seam that returns S3-shaped metadata (`storage key`, ownership fields, content metadata, status), while allowing a local/dev adapter for this slice.
  - Extend the chat contract only enough to accept `fileIds`, validate they belong to the current tenant/user/session, persist the linkage to the saved user turn, and expose bounded attachment context to the assistant stub.
- Acceptable simplifications:
  - The current slice may keep file persistence local/dev-only if the route contracts and stored metadata still look like real S3-backed session attachments.
  - Because sessions/messages are already backed by a local replaceable adapter, attachment durability does not need to exceed the same dev/PoC persistence horizon in this item.
  - Assistant attachment context can be metadata-first and bounded to a small recent set; do not fake full document ingestion or retrieval.
- Reject scope creep:
  - No presigned download URLs, preview endpoints, cleanup jobs, virus scanning, lifecycle automation, or real S3/Aurora/AWS wiring.
  - No client-controlled tenant scope, session ownership bypass, or attachment use outside the owning session.
  - No partial-success upload semantics. One invalid file should fail the whole request.

## 2026-04-01 ENGINEER

- Implemented `ITEM-0002` entirely under `apps/web` plus allowed baton files.
- Added a tenant-scoped server persistence seam in `apps/web/server/utils/chat-store.ts` with Aurora-shaped session/message records (`tenant_id`, `user_id`, `session_id`, timestamps, citations) backed by a replaceable in-memory adapter for the current slice.
- Added minimal session and message routes:
  - `GET /api/sessions?userId=...`
  - `POST /api/sessions`
  - `GET /api/sessions/:id/messages?userId=...`
- Added `POST /api/chat` that:
  - resolves tenant scope only from server runtime config,
  - auto-creates a session if `sessionId` is absent,
  - persists the user message before responding,
  - streams assistant chunks as SSE-style `data:` frames over a `ReadableStream`,
  - persists the final assistant message with citation-shaped metadata.
- Added a minimal chat UI in `apps/web/app/app.vue` with:
  - browser-stored fallback `userId`,
  - session list and reload,
  - persisted active-session recall per tenant,
  - `fetch` `POST` streaming consumption for assistant deltas.
- Kept deferred scope out: no uploads, no OAuth completion, no Aurora wiring, no Bedrock integration, no infra edits.
- Verification performed:
  - `cd apps/web && npm run build` succeeded.

## 2026-04-02 VALIDATOR

- **REVISE**: `ITEM-0002` is not acceptable yet. The current implementation misses the active item's usable chat-screen contract and does not honor runtime tenant injection the way the goal and decision lock require.
- `apps/web/app/app.vue` is not wired into the served application. After `cd apps/web && npm run build`, requesting `/` still serves the default Nuxt welcome page rather than the chat UI, so a user cannot currently open the intended chat surface for this slice.
- `apps/web/nuxt.config.ts` derives `runtimeConfig.tenantId` from `process.env.TENANT_ID` at config-evaluation time, but the built server does not pick up a deployment-time `TENANT_ID`. Repro: build once with no tenant env, then run `TENANT_ID=tenant-alpha node .output/server/index.mjs`; `GET /api/health` still returns `tenantId: "local-dev"`. That breaks the locked contract that the same built image can be deployed per tenant with tenant scope coming from server-side runtime env/config, not baked at build time.
- Secondary scope-alignment concern: the client uses `runtimeConfig.public.tenantId` for local-storage namespacing and optimistic message metadata in `apps/web/app/app.vue`, even though the decision lock says public tenant config is display-only and server tenant scope must be the authoritative value. Fixing the root page wiring may change this implementation anyway, but the follow-up should keep tenant-dependent client behavior consistent with the server-derived tenant contract.
- Verification performed in validation:
  - `cd apps/web && npm run build` succeeded.
  - Ran the built server and confirmed `POST /api/chat`, `GET /api/sessions`, and `GET /api/sessions/:id/messages` behave tenant/user scoped for the current built tenant and ignore caller-supplied `tenantId` input.
  - Reproduced the two blocking defects above by requesting `/` from the built server and by restarting the built server with `TENANT_ID=tenant-alpha` before calling `/api/health`.

## 2026-04-02 VALIDATOR

- **DONE**: `ITEM-0002` now satisfies the active slice and can return to `PLANNER`.
- Validation confirmed the implementation remains inside `apps/web` plus allowed baton files only. No uploads, OAuth completion, Aurora wiring, Bedrock integration, infra expansion, or root-workspace/bootstrap changes were added in the fix pass.
- The previously blocking defects are resolved on the built artifact:
  - `/` now serves the chat UI rather than the default Nuxt welcome screen.
  - Building once and then starting the built server with `TENANT_ID=tenant-alpha` correctly changes server tenant scope at runtime, satisfying the same-image-per-tenant contract.
- Tenant isolation and contract checks that passed:
  - `POST /api/chat` ignores caller-supplied tenant input and persists tenant-scoped Aurora-shaped session/message records using the server-derived tenant.
  - `GET /api/sessions?userId=...` returns only that user's sessions within the current tenant.
  - `GET /api/sessions/:id/messages?userId=...` returns message history for the owning user and returns `404` for a different user.
  - Streaming remains the locked `fetch` + `ReadableStream` pattern with SSE-style `data:` frames over `POST /api/chat`.
- Verification performed in validation:
  - `cd apps/web && npm run build` succeeded.
  - Ran `node .output/server/index.mjs` and confirmed `GET /api/health` returned `tenantId: "local-dev"` and `/` rendered the chat UI, not `NuxtWelcome`.
  - Ran `TENANT_ID=tenant-alpha node .output/server/index.mjs` and confirmed `GET /api/health` returned `tenantId: "tenant-alpha"`.
  - Requested `/` from that runtime-tenant server and confirmed SSR HTML included the chat UI and rendered `tenant-alpha`.
  - Called `POST /api/chat` with a bogus caller `tenantId` and confirmed the streamed session/message payloads still used `tenant-alpha`.
  - Confirmed user scoping with `GET /api/sessions?userId=user-a`, `GET /api/sessions?userId=user-b`, `GET /api/sessions/:id/messages?userId=user-a`, and a `404` for the same session under `user-b`.
- Residual note, not a blocker for this slice: the serialized public Nuxt config in SSR still shows `public.tenantId: "local-dev"` when only `TENANT_ID` is provided at runtime, but the served UI and API behavior now derive operational tenant state from the server response path rather than that public fallback, which is consistent with the decision lock for `ITEM-0002`.

## 2026-04-02 ENGINEER

- Implemented `ITEM-0003` inside `apps/web` plus allowed baton files only.
- Extended `apps/web/server/utils/chat-store.ts` with Aurora-shaped `session_files` records plus message-level `attached_files` metadata so uploads and chat turns share the same tenant/user/session-scoped persistence seam.
- Added `apps/web/server/utils/file-storage.ts` as a replaceable local/dev object-storage adapter. It stores bytes in process memory but returns S3-shaped metadata (`storage_bucket`, ownership-hierarchical `storage_key`, size) for the current slice.
- Added `POST /api/files` in `apps/web/server/api/files.post.ts`:
  - accepts `multipart/form-data`,
  - requires `userId`, `sessionId`, and one or more `files`,
  - validates tenant-scoped session ownership before any persistence,
  - enforces max 5 files per request, max 10MB per file, max 20 files per session, and a MIME allowlist limited to PDF, DOCX, and TXT,
  - fails invalid requests atomically instead of partially saving accepted files.
- Extended `POST /api/chat` to accept `fileIds`, verify they belong to the current tenant/user/session, persist the attachment linkage on the saved user message, and pass bounded attachment metadata into the assistant stub.
- Extended `GET /api/sessions/:id/messages` to return `sessionFiles` alongside messages so the UI can reload selectable attachments within the current session without adding a new route.
- Updated `apps/web/app/app.vue` with a narrow upload-and-attach UI:
  - upload control for the allowed document types,
  - session-file list with attachment selection for the next chat turn,
  - attached-file rendering on saved messages,
  - automatic session creation before upload when needed.
- Verification performed:
  - `cd apps/web && npm run build` succeeded.
  - Ran the built server with `node .output/server/index.mjs`.
  - Verified `GET /api/health` still returned the server-derived tenant.
  - Verified `POST /api/files` rejected a missing/foreign session with `404`.
  - Verified `POST /api/files` accepted a TXT upload and returned tenant/user/session-owned metadata with an S3-shaped storage key.
- Verified `POST /api/chat` accepted the returned `fileId`, streamed the saved user message with `attached_files`, and the assistant stub referenced the attachment context in its streamed response.
- Verified `GET /api/sessions/:id/messages?userId=user-a` returned both `sessionFiles` and persisted message attachment metadata after the streamed response completed.
- Verified `POST /api/chat` rejected another user attempting to reuse that `fileId` with `400`.

## 2026-04-02 VALIDATOR

- **DONE**: `ITEM-0003` satisfies the active slice and can return to `PLANNER`.
- Validation confirmed the implementation stays inside `apps/web` plus allowed baton files only. No infra delivery, root-workspace/bootstrap changes, OAuth completion, real S3/Aurora wiring, presigned URLs, cleanup jobs, or broader auth scope were introduced.
- Upload contract checks that passed on the built server:
  - `POST /api/files` requires `multipart/form-data`, `userId`, `sessionId`, and an existing tenant/user-owned session before any persistence.
  - Server-side validation rejects invalid requests atomically for the whole upload on the locked constraints: max 5 files per request, max 10MB per file, max 20 files per session, and MIME allowlist limited to PDF, DOCX, and TXT.
  - Successful uploads persist Aurora-shaped `sessionFiles` metadata with tenant/user/session ownership, file names, content type, size, `storage_bucket`, `storage_key`, status, and timestamps.
  - The local/dev storage seam returns S3-shaped ownership-hierarchical keys and remains replaceable; validation focused on contract shape, not real object storage behavior.
- Chat attachment checks that passed:
  - `POST /api/chat` ignores caller-controlled tenant input and uses the server-derived tenant for both uploads and message persistence.
  - Valid `fileIds` for the owning tenant/user/session are saved on the user turn as `attached_files`.
  - Stolen or cross-user `fileIds` are rejected with `400`, and foreign-session message history still returns `404`.
  - The assistant stub receives bounded recent attachment context and reflects that metadata in the streamed reply path.
  - `GET /api/sessions/:id/messages` returns both `sessionFiles` and persisted message attachment metadata so the UI can reload session attachment state without a separate file-list route.
- Verification performed in validation:
  - `cd apps/web && npm run build` succeeded.
  - Ran the built server with `node .output/server/index.mjs` and confirmed `GET /api/health` returned `tenantId: "local-dev"`.
  - Created sessions for multiple users, uploaded a TXT file successfully, and confirmed the response included tenant/user/session-owned metadata plus an ownership-hierarchical `storage_key`.
  - Confirmed `POST /api/files` returned `404` for a foreign session, `400` for an unsupported MIME type, `400` for more than 5 files in one request, `400` for a file larger than 10MB, and `400` once a session already held 20 files while preserving exactly 20 stored files.
  - Confirmed `POST /api/chat` streamed saved `attached_files` metadata and attachment-aware assistant text for a valid upload, and returned `400` when another user attempted to reuse that `fileId`.
  - Confirmed `GET /api/sessions/:id/messages?userId=user-a` returned `sessionFiles` plus attached-file message metadata, while the same session under `user-b` returned `404`.
  - Re-ran the built server with `TENANT_ID=tenant-alpha` and confirmed `/api/health`, session creation, file upload, storage keys, and chat persistence all used the runtime tenant rather than caller-controlled input.

## 2026-04-02 SENIOR_JUDGMENTAL_ENGINEER

- **DONE**: `ITEM-0004` is ready for engineering without user escalation.
- The current codebase still contains placeholder-only CDK stacks in [infra/cdk/lib/shared-stack.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/shared-stack.ts) and [infra/cdk/lib/tenant-stack.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/tenant-stack.ts); engineering should treat that as debt to replace, not a scaffold to decorate with more outputs.
- `ai/requirements.md` remains template residue and is not authoritative for this item. Source of truth is `ai/goal.yaml`, `ai/prd.yaml`, `ai/active_item.yaml`, `ai/decision-lock.yaml`, and the item-specific simplification rules.

## 2026-04-02 ENGINEER

- Narrowed the Aurora schema bootstrap inputs without changing the accepted provider-backed custom resource contract.
- [shared-stack.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/shared-stack.ts#L27) now passes complete shared-schema DDL statements for `app.sessions`, `app.messages`, and `app.session_files` rather than line-by-line SQL fragments.
- [tenant-stack.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/tenant-stack.ts#L31) now constructs complete per-tenant `CREATE SCHEMA`, `CREATE EXTENSION`, `CREATE TABLE`, and HNSW `CREATE INDEX` statements before wiring them into `AuroraSchema`.
- Left [aurora-schema.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/constructs/aurora-schema.ts) unchanged on purpose: it already executes one ordered Data API `ExecuteStatement` per statement, keeps update stability via the same physical resource id, and remains a no-op on delete.
- Verification performed:
  - `cd apps/web && npm run build`
  - `cd infra/cdk && npm run build`
  - `cd infra/cdk && npm run synth`

## 2026-04-02 ENGINEER

- Addressed the two validator-blocking deploy-path gaps for `ITEM-0004`.
- Replaced the broken `aws-events-targets` ingestion call in [tenant-stack.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/tenant-stack.ts) with an EventBridge Scheduler `Universal` target that invokes `bedrockagent:startIngestionJob` on a daily rate using explicit `bedrock:StartIngestionJob` IAM permissions.
- Removed the hidden pre-pushed-image dependency from [ui-stack.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/ui-stack.ts) by building the Nuxt container directly from [apps/web/Dockerfile](/home/sundaram/code/multi-tenant-rag-demo/apps/web/Dockerfile) as a CDK container asset during deploy/synth instead of assuming `latest` already exists in ECR.
- Simplified the environment config and app instantiation path accordingly in [tenants.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/config/tenants.ts) and [app.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/bin/app.ts); tenant stacks still instantiate from the in-repo config source.
- Verification performed:
  - `cd apps/web && npm run build` succeeded.
  - `cd infra/cdk && npm run build` succeeded.
  - `cd infra/cdk && npm run synth` succeeded and synthesized `SharedStack-dev`, `TenantStack-tenant-a-dev`, `UIStack-tenant-a-dev`, `TenantStack-tenant-b-dev`, and `UIStack-tenant-b-dev`.

## 2026-04-02 ENGINEER

- Implemented `ITEM-0004` across `infra/cdk` and the minimal app-local deployment surface in `apps/web`.
- Replaced the placeholder CDK stack wiring with:
  - a concrete shared stack for VPC, ECS cluster, ALB/listener, Aurora Serverless v2, shared attachments bucket, ECR repository, shared guardrail, shared log/SSM outputs, and shared Data API schema bootstrap;
  - a per-tenant stack for docs bucket, Aurora vector-schema bootstrap, Bedrock knowledge base, Bedrock data source, Bedrock agent plus alias, tenant runtime secret, tenant log group, and daily ingestion schedule shim;
  - a per-tenant UI stack for the same-image-per-tenant ECS/Fargate service, listener-rule wiring, task/execution roles, health checks, and tenant env plus secret-backed runtime config.
- Added an in-repo tenant/environment config source at `infra/cdk/config/tenants.ts`, and updated `infra/cdk/bin/app.ts` to instantiate one shared stack plus tenant/UI stacks for `tenant-a` and `tenant-b` from that config.
- Added `apps/web/Dockerfile`, `apps/web/.dockerignore`, and an app-local `start` script so the Nuxt app can be built and pushed as the shared ECS image.
- Verification performed:
  - `cd apps/web && npm run build` succeeded.
  - `cd infra/cdk && npm run build` succeeded.
  - `cd infra/cdk && npm run synth` succeeded and synthesized `SharedStack-dev`, both tenant stacks, and both UI stacks.
- Remaining validator focus:
  - CDK synth still emits an intentional warning on the `AwsApi` ingestion-schedule shim because the EventBridge target helper does not recognize `BedrockAgent` as an SDK service name. The stack still synthesizes cleanly; validate whether this PoC shim is acceptable or should be treated as too weak for the item.
  - The UI services assume the shared ECR repository contains the configured shared image tag (`latest`) before `cdk deploy --all` attempts to stabilize ECS tasks.
- Required implementation shape:

## 2026-04-02 VALIDATOR

- **REVISE**: `ITEM-0004` still cannot be accepted because the shared Aurora bootstrap schema in [shared-stack.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/shared-stack.ts#L27) does not match the existing application persistence contract in [chat-store.ts](/home/sundaram/code/multi-tenant-rag-demo/apps/web/server/utils/chat-store.ts#L4).
- Concrete contract mismatches found:
  - `app.sessions` is created with primary key `session_id`, while the app session shape is keyed as `id`.
  - `app.messages` is created with `message_id` and `attachment_ids`, but the app message shape expects `id`, `user_id`, and `attached_files`.
  - `app.session_files` omits `storage_bucket`, but the app file shape requires both `storage_bucket` and `storage_key`.
- This is a real deployability issue for the current PoC baseline, not a stylistic preference. `ITEM-0004` wires Aurora credentials into the Nuxt ECS tasks, so provisioning a schema that disagrees with the app’s locked Aurora-shaped records would turn the first real Aurora integration into avoidable migration churn or runtime breakage.
- Validation checks that passed:
  - `cd apps/web && npm run build` still succeeds.
  - `cd infra/cdk && npm run synth` still succeeds and emits all expected shared, tenant, and UI stacks.
  - The narrowed Aurora custom-resource execution path now correctly accepts ordered standalone SQL statements instead of line fragments.
- Required follow-up: keep the accepted shared/tenant/UI stack split and one-statement-at-a-time Aurora custom resource, but align the shared app-schema DDL with the current Nuxt persistence contract before this item returns for acceptance.
  - add a concrete CDK app instantiation path that creates one shared stack and per-tenant tenant/UI stacks from an in-repo tenant config source;
  - provision real PoC resources for the locked stack categories rather than placeholder descriptions;
  - preserve the same-image-per-tenant ECS contract and keep tenant identity deploy-time/server-side.
- Acceptable PoC shortcuts:
  - thin custom resources or lower-level CDK constructs where Bedrock or schema bootstrap coverage is awkward;
  - minimal ALB routing and ECS scaling defaults;
  - secret-backed runtime wiring that is coherent for deployment even if production hardening remains deferred.
- Reject these failure modes:
  - no separate API service or Lambda application backend;
  - no fake shared Bedrock agent/KB shortcut;
  - no root-workspace/bootstrap churn;

## 2026-04-02 VALIDATOR

- **REVISE**: the Aurora schema bootstrap fix is still functionally incorrect, so `ITEM-0004` cannot be accepted yet.
- [aurora-schema.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/constructs/aurora-schema.ts#L42) now executes one `ExecuteStatement` call per `statements[]` entry, but [shared-stack.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/shared-stack.ts#L145) and [tenant-stack.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/tenant-stack.ts#L63) still pass line-by-line SQL fragments such as `CREATE TABLE ... (` and individual column lines. Those fragments are not valid standalone SQL statements, so the custom resource will fail during deploy before the shared app tables or tenant vector table/index are created.
- This is a concrete implementation defect, not a planning ambiguity. Keep the current stack boundaries and deployment model, but change the schema bootstrap contract so each executed unit is a complete valid statement in the intended order.
- Static regression check passed outside the defect above: the scheduler/container-asset/stack-boundary work remains intact, and the current change stays within `infra/cdk` plus allowed baton files.
- Verification performed in validation:
  - `cd apps/web && npm run build` succeeded.
  - `cd infra/cdk && npm run build` succeeded.
  - `cd infra/cdk && npm run synth` succeeded.
- Acceptance remains blocked because synth does not exercise the runtime Data API calls used by the schema custom resource, and the checked-in statement arrays are invalid for the new one-call-per-statement execution path.

## 2026-04-02 ENGINEER

- Fixed the remaining deploy-safety defect in the Aurora schema bootstrap path for `ITEM-0004`.
- Replaced the single-call `AwsCustomResource` in [aurora-schema.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/constructs/aurora-schema.ts) with a provider-backed custom resource that executes an ordered `statements` array one Data API `ExecuteStatement` call at a time on create/update and no-ops on delete.
- Updated [shared-stack.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/shared-stack.ts) and [tenant-stack.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/tenant-stack.ts) to pass explicit statement arrays instead of joined multi-statement SQL blobs, preserving the existing schema/table/index definitions and stack boundaries.
- Verification performed:
  - `cd apps/web && npm run build` succeeded.
  - `cd infra/cdk && npm run build` succeeded.
  - `cd infra/cdk && npm run synth` succeeded and synthesized `SharedStack-dev`, both tenant stacks, and both UI stacks.

## 2026-04-02 VALIDATOR

- **REVISE**: `ITEM-0004` still has a deployment-blocking defect in the Aurora schema bootstrap path, so it should return to `ENGINEER`.
- The advertised verification now passes at build/synth level:
  - `cd apps/web && npm run build` succeeded.
  - `cd infra/cdk && npm run build` succeeded.
  - `cd infra/cdk && npm run synth` succeeded and synthesized `SharedStack-dev`, `TenantStack-tenant-a-dev`, `UIStack-tenant-a-dev`, `TenantStack-tenant-b-dev`, and `UIStack-tenant-b-dev`.
- The remaining blocker is in [aurora-schema.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/constructs/aurora-schema.ts#L17), which issues a single `RDSDataService.executeStatement` call with `sql: props.sql`. Both callers build `props.sql` by concatenating multiple DDL statements into one string in [shared-stack.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/shared-stack.ts#L140) and [tenant-stack.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/tenant-stack.ts#L58).
- That means the stacks synthesize but the schema custom resources are wired to submit multi-statement SQL as one Data API `ExecuteStatement` request during deploy. This is a deploy-path correctness issue, not a documentation nit: the current bootstrap resource graph cannot reliably create the shared app schema or tenant vector schema/indexes under `cdk deploy --all`.
- Keep the current stack split and the successful fixes for scheduler and image build path. The required engineering change is narrow: make the schema bootstrap path execute the DDL as supported Data API operations instead of one joined blob, then re-run the same `apps/web` build and `infra/cdk` build/synth verification.
