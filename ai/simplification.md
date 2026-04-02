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
15. For `ITEM-0003`, extend the existing `chat-store` and assistant seams rather than inventing parallel upload-specific persistence or request flows.
16. For `ITEM-0003`, keep storage pragmatic: a local/dev adapter may use app-local or process-local storage so long as the public contract remains S3-shaped and replaceable.
17. For `ITEM-0003`, enforce all upload limits before persisting anything and fail the whole request if any selected file violates count, size, MIME, session ownership, or session-level quota rules.
18. For `ITEM-0003`, attachment context for the assistant should be bounded and metadata-first; do not implement byte-heavy retrieval tricks, presigned downloads, or fake Bedrock ingestion workflows in this slice.
19. For `ITEM-0004`, replace the placeholder-only CDK outputs with real resource definitions; comments, intent-only outputs, and manual-console gaps do not count as delivery.
20. For `ITEM-0004`, keep the slice centered in `infra/cdk`; touch `apps/web` only if the Nuxt container or ECS runtime contract genuinely needs an app-local deployment file.
21. For `ITEM-0004`, prefer a small shared config model that instantiates one SharedStack, one TenantStack per tenant, and one UIStack per tenant from a concrete in-repo tenant/environment definition.
22. For `ITEM-0004`, acceptable PoC pragmatism means thin CDK shims or custom resources for awkward AWS edges, not punting named resources or wiring into placeholders.
23. For `ITEM-0004`, SharedStack should own cross-tenant platform primitives only; do not leak tenant-specific Bedrock, schema, or service resources into it just because sharing is easier.
24. For `ITEM-0004`, TenantStack should own hard-isolation resources per tenant: docs bucket, KB, agent plus alias, schema/bootstrap path, scheduler, and tenant IAM/logging.
25. For `ITEM-0004`, UIStack should consume shared outputs and tenant config to create the per-tenant Fargate service and ALB rule for the same-image-per-tenant deployment model.
26. For `ITEM-0004`, defer CI/CD, custom domains, production autoscaling polish, and deep operational tooling unless a minimal in-scope resource is required to keep `cdk deploy --all` coherent.
27. For the `ITEM-0005` revise pass, keep the scope narrow: fix only the assistant fallback/grounding contract and any validation evidence notes required to accept the slice.
28. For the `ITEM-0005` revise pass, do not reopen the accepted session, upload, tenant-isolation, or CDK architecture work unless the fallback fix exposes a concrete defect there.
29. For the `ITEM-0005` revise pass, the local assistant seam must stop pretending grounded KB support exists when it does not; if no bounded session/file evidence supports an answer, return a clear limitation message and no synthetic citation.
30. For the `ITEM-0005` revise pass, preserve the existing POST-streaming contract and persistence shape so the fix is compatible with the later Bedrock adapter rather than another rewrite.
