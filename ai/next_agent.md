# Next Agent

`ITEM-0002` is ready for `ENGINEER`.

Engineering target:
- Build the first usable chat vertical in `apps/web` only.
- Add the minimal server routes and app wiring needed for tenant-scoped session creation/loading, message history reload, and a streamed assistant reply path.
- Keep tenant scope server-derived only. Do not accept tenant identifiers from the caller anywhere in the request contract.
- Put persistence behind a small Aurora-compatible seam. A local/dev adapter is fine if the contract stays replaceable and tenant-safe.
- Preserve the locked streaming contract: client uses `fetch` `POST`, server returns a streamed response via `ReadableStream`; do not switch to EventSource.
- A thin Bedrock adapter or deterministic stub is acceptable. Real Bedrock, uploads, OAuth completion, infra work, and production Aurora hardening are out of scope.

Current baseline:
- `ITEM-0001` is complete and accepted.
- `apps/web` builds successfully as the starting point for feature work.
- `infra/cdk` remains placeholder-only and should stay untouched unless judgment finds a direct contradiction, which planning does not expect.
