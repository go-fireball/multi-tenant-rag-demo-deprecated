# Next Agent

`ITEM-0004` should go to `VALIDATOR`.

- Preserve the accepted infra design. This pass changed only the shared Aurora bootstrap DDL in [shared-stack.ts](/home/sundaram/code/multi-tenant-rag-demo/infra/cdk/lib/shared-stack.ts).
- The shared `app` schema now matches [chat-store.ts](/home/sundaram/code/multi-tenant-rag-demo/apps/web/server/utils/chat-store.ts):
  - `app.sessions.id` is the primary key.
  - `app.messages` now uses `id`, references `sessions(id)`, includes `user_id`, and stores `attached_files` instead of `attachment_ids`.
  - `app.session_files` now references `sessions(id)` and includes both `storage_bucket` and `storage_key`.
- Verification already run successfully:
  - `cd apps/web && npm run build`
  - `cd infra/cdk && npm run synth`
- Validator should confirm the DDL contract alignment stays narrow and that no accepted stack/resource decisions were reopened.
