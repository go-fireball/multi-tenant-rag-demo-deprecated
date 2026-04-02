# Simplification Guidance

1. Prefer straightforward modular monolith structures.
2. Keep interfaces small and explicit.
3. Add abstractions only when repeated pain is proven.
4. Preserve existing business behavior unless requirements say otherwise.
5. Bias toward maintainability over novelty.
6. For `ITEM-0001`, create only the minimum in-scope baseline under the current engineer contract: `apps/web`, `infra/cdk`, and only app-local/config files that live within those directories.
7. Do not require root-level workspace normalization, shared root TypeScript config, or lockfile/package-manager setup in this item; that was explicitly deferred by the human decision on 2026-04-01.
8. Nuxt server routes are the backend boundary for this PoC; do not scaffold a second service, RPC layer, or Lambda app runtime.
9. CDK code in this slice should prove stack shape and tenant/shared separation only; placeholders are correct, real AWS resource wiring is premature here.
10. Authentication, Aurora access, Bedrock calls, uploads, streaming chat behavior, and production deployment polish all belong to later items, not this scaffold.
11. For `ITEM-0002`, keep all implementation inside `apps/web` plus baton files; do not reopen root workspace/bootstrap work or expand `infra/cdk`.
12. For `ITEM-0002`, favor a small server-side persistence seam that stores sessions and messages in an Aurora-shaped model without pretending to solve full database production hardening yet.
13. For `ITEM-0002`, the streamed chat route should prove the POST plus `ReadableStream` contract and tenant isolation rules first; Bedrock can stay behind a thin adapter or deterministic stub.
14. For `ITEM-0002`, reject upload handling, OAuth completion, file attachment persistence, and cross-item cleanup disguised as "supporting work."
