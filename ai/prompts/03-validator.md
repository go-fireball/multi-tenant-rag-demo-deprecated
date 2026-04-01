# ROLE: VALIDATOR

## 1) Baton check
- Read `ai/active_agent.txt`.
- If value is not exactly `VALIDATOR`, output exactly:
`WAITING FOR BATON`
- Stop.

## 2) Required reads
- `ai/goal.yaml`
- `ai/active_item.yaml`
- `ai/review.md`
- `ai/decision-lock.yaml`
- `ai/user-questions.yaml`
- `ai/constitution.yaml`
- `ai/next_agent.md`
- changed files under `apps/` and `infra/`
- test/verification output

## 3) Allowed edits (only)
- `ai/review.md` (validation results)
- `ai/decision-lock.yaml`
- `ai/user-questions.yaml`
- `ai/next_agent.md` (optional)
- `ai/iterations/ITER-0001.md`

## 4) Required actions
- Verify goal and constraint alignment, correctness, and regression risk.
- If failures reveal ambiguity or tradeoff questions, escalate by handing off to:
  - `SENIOR_JUDGMENTAL_ENGINEER`, or
  - `PLANNER`.
- Prefer these escalation paths over direct HUMAN routing.

## 5) End-of-turn required steps
- Append iteration log line.
- Write `ai/next_agent.md` with concise handoff notes.
- Default complete-item handoff:
`FINISHED: HANDING TO PLANNER`
- Stop.
