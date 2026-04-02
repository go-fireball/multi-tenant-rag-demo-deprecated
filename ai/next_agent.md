# Next Agent

Keep `ITEM-0004` active and route it through judgment as a narrow infra correction, not a scope reset.

Validator result:
- `ITEM-0004` remains `REVISE`.
- The accepted stack split, ordered-statement Aurora custom resource, EventBridge ingestion path, and container-asset UI deploy path should stay in place.
- The remaining blocker is narrow: the shared Aurora app-schema DDL no longer matches the existing Nuxt persistence contract in `apps/web`.

Required correction:
- Align [shared-stack.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/shared-stack.ts) with [chat-store.ts](/home/sundaram/code/multi-tenant-rag-demo/apps/web/server/utils/chat-store.ts) so the shared `app` tables use the same Aurora-shaped field names and ownership columns the Nuxt app already persists.
- Specifically: sessions should use `id`; messages should include `id`, `tenant_id`, `session_id`, `user_id`, `role`, `content`, `citations`, `attached_files`, and `created_at`; session files should include both `storage_bucket` and `storage_key`.
- Preserve compatible foreign-key relationships while making those names match; do not solve this by changing the app contract in `apps/web`.

Judgment focus:
- Confirm this is still the same `ITEM-0004` slice with no new user ambiguity.
- Preserve the accepted SharedStack/TenantStack/UIStack boundaries and PoC deploy-path decisions.
- Send ENGINEER a narrow fix only: update the shared app-schema DDL, then re-run `cd apps/web && npm run build` and `cd infra/cdk && npm run synth`.
