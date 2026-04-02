# Next Agent

Route `ITEM-0004` back through planning with a narrow implementation correction.

Validator result:
- `ITEM-0004` is still `REVISE`, not accepted.
- The new ordered-statement Aurora custom-resource path is fine, and `cd apps/web && npm run build` plus `cd infra/cdk && npm run synth` still succeed.
- The remaining blocker is a schema-contract mismatch between the shared Aurora bootstrap DDL and the current app persistence shapes.

Concrete mismatches to correct:
- [shared-stack.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/shared-stack.ts#L31) creates `app.sessions(session_id, ...)`, but [chat-store.ts](/home/sundaram/code/multi-tenant-rag-demo/apps/web/server/utils/chat-store.ts#L4) uses `id`.
- [shared-stack.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/shared-stack.ts#L41) creates `app.messages(message_id, session_id, role, content, citations, attachment_ids, created_at)` but the app message contract in [chat-store.ts](/home/sundaram/code/multi-tenant-rag-demo/apps/web/server/utils/chat-store.ts#L19) expects `id`, `tenant_id`, `session_id`, `user_id`, `role`, `content`, `citations`, `attached_files`, `created_at`.
- [shared-stack.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/shared-stack.ts#L53) creates `app.session_files` without `storage_bucket`, while [chat-store.ts](/home/sundaram/code/multi-tenant-rag-demo/apps/web/server/utils/chat-store.ts#L31) requires both `storage_bucket` and `storage_key`.

Planner handoff:
- Keep the accepted shared/tenant/UI stack boundaries, the EventBridge/container-asset deploy path, and the one-statement-at-a-time Aurora schema custom resource.
- Send this back for a narrow engineer fix that aligns the shared Aurora app-schema DDL with the current Nuxt persistence contract, then re-run `cd apps/web && npm run build` and `cd infra/cdk && npm run synth`.
