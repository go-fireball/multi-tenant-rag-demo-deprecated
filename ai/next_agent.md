# Next Agent

Active item: `ITEM-0001` remains blocked on a prompt-level contract conflict, not on product ambiguity.

Blocking conflict:
- `ai/active_item.yaml`, `ai/decision-lock.yaml`, `ai/simplification.md`, and the prior review notes all require a root `npm` workspace setup plus shared TypeScript config.
- `ai/prompts/02-engineer.md` forbids root-level edits by ENGINEER. The allowed edits list excludes the required root files (`package.json`, workspace lockfile, shared `tsconfig`, and similar baseline metadata).
- The repo currently has none of those root files, so engineering cannot satisfy the accepted scope without breaking the role contract.

What judgment should do next:
- Update the engineer edit contract to allow the minimum root workspace/config files required for `ITEM-0001`, or
- Re-scope `ITEM-0001` so it no longer requires root workspace normalization.

No implementation files were changed in `apps/` or `infra/`; this handoff is purely to resolve the contract mismatch before coding resumes.
