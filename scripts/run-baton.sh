#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MAX_STEPS=10
EXECUTOR=""
MODEL=""
DRY_RUN=0
FULL_AUTO=1
GIT_ENABLED=1

usage() {
  cat <<'USAGE'
Usage: run-baton.sh [OPTIONS]

Options:
  --executor <codex|claude|copilot>   AI executor to use (required)
  --model <model>                     Model override (default depends on executor)
  --max-steps <n>                     Maximum baton steps (default: 10)
  --no-full-auto                      Stop after one handoff
  --no-git                            Disable branch-per-iteration git commits
  --dry-run                           Print the command that would run, then exit
  --help                              Show this help
USAGE
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --executor) EXECUTOR="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    --max-steps) MAX_STEPS="$2"; shift 2 ;;
    --no-full-auto) FULL_AUTO=0; shift ;;
    --no-git) GIT_ENABLED=0; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --help) usage ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

if [[ -z "$EXECUTOR" ]]; then
  echo "Error: --executor is required. Choose one of: codex, claude, copilot"
  exit 1
fi

case "$EXECUTOR" in
  codex|claude|copilot) ;;
  *) echo "Error: unknown executor '$EXECUTOR'. Choose one of: codex, claude, copilot"; exit 1 ;;
esac

if [[ -z "$MODEL" ]]; then
  case "$EXECUTOR" in
    codex) MODEL="gpt-5.4" ;;
    claude|copilot) MODEL="claude-sonnet-4-6" ;;
  esac
fi

valid_roles="PLANNER SENIOR_JUDGMENTAL_ENGINEER ENGINEER VALIDATOR HUMAN"

resolve_prompt_file() {
  case "$1" in
    PLANNER) echo "ai/prompts/00-planner.md" ;;
    SENIOR_JUDGMENTAL_ENGINEER) echo "ai/prompts/01-senior-judgmental-engineer.md" ;;
    ENGINEER) echo "ai/prompts/02-engineer.md" ;;
    VALIDATOR) echo "ai/prompts/03-validator.md" ;;
    HUMAN) echo "ai/prompts/human.md" ;;
    *) return 1 ;;
  esac
}

check_cli() {
  local cli
  case "$EXECUTOR" in
    codex) cli="codex" ;;
    claude) cli="claude" ;;
    copilot) cli="copilot" ;;
  esac
  command -v "$cli" >/dev/null 2>&1 || { echo "$cli CLI not found"; exit 1; }
}

build_exec_cmd() {
  local prompt="$1"
  local output_last_message_file="${2:-}"
  cmd=()
  case "$EXECUTOR" in
    codex)
      cmd=("codex" "exec" "--model" "$MODEL")
      [[ $FULL_AUTO -eq 1 ]] && cmd+=("--dangerously-bypass-approvals-and-sandbox")
      [[ -n "$output_last_message_file" ]] && cmd+=("--output-last-message" "$output_last_message_file")
      cmd+=("$prompt")
      ;;
    claude)
      cmd=("claude" "--model" "$MODEL" "--dangerously-skip-permissions" "-p" "$prompt")
      ;;
    copilot)
      cmd=("copilot" "--model" "$MODEL" "--allow-all" "-p" "$prompt")
      ;;
  esac
}

ITER_BRANCH=""
SOURCE_BRANCH=""

setup_iter_branch() {
  [[ $GIT_ENABLED -eq 0 ]] && return
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Warning: not a git repo; disabling git tracking."
    GIT_ENABLED=0
    return
  fi
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Warning: uncommitted changes detected; disabling git tracking."
    GIT_ENABLED=0
    return
  fi

  SOURCE_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  local item_id
  item_id="$(grep '^id:' ai/active_item.yaml 2>/dev/null | head -1 | sed 's/^id:[[:space:]]*//')"
  [[ -z "$item_id" || "$item_id" == "null" ]] && item_id="run-$(date -u +%Y%m%d-%H%M%S)"
  ITER_BRANCH="iter/${item_id}"
  if git rev-parse --verify "$ITER_BRANCH" >/dev/null 2>&1; then
    local counter=2
    while git rev-parse --verify "${ITER_BRANCH}-${counter}" >/dev/null 2>&1; do
      ((counter++))
    done
    ITER_BRANCH="${ITER_BRANCH}-${counter}"
  fi
  git checkout -b "$ITER_BRANCH"
}

commit_step() {
  local step_num="$1"
  local role="$2"
  [[ $GIT_ENABLED -eq 0 ]] && return
  if git diff --quiet && git diff --cached --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
    return
  fi
  git add -A
  git commit -m "baton step $step_num: $role

Executor: $EXECUTOR | Model: $MODEL
Branch: $ITER_BRANCH"
}

extract_handoff_notes() {
  [[ -f ai/next_agent.yaml ]] || return 0
  awk '
    /^handoff_notes:[[:space:]]*\|/ { in_block=1; next }
    in_block {
      if ($0 ~ /^  /) {
        sub(/^  /, "")
        print
      } else {
        exit
      }
    }
  ' ai/next_agent.yaml
}

user_questions_waiting_for_role() {
  local expected_role="$1"
  [[ -f ai/user-questions.yaml ]] || return 1

  local status return_to question_count
  status="$(grep '^status:' ai/user-questions.yaml 2>/dev/null | head -1 | sed 's/^status:[[:space:]]*//' | tr -d '[:space:]')"
  return_to="$(grep '^return_to_role:' ai/user-questions.yaml 2>/dev/null | head -1 | sed 's/^return_to_role:[[:space:]]*//' | tr -d '[:space:]')"
  question_count="$(grep -cE '^[[:space:]]*-[[:space:]]' ai/user-questions.yaml 2>/dev/null || true)"

  [[ "$status" == "waiting" ]] || return 1
  [[ "$return_to" == "$expected_role" ]] || return 1
  [[ "$question_count" -gt 0 ]] || return 1
}

if ! ./scripts/check-baton.sh; then
  echo "Baton state is invalid; cannot start."
  exit 1
fi

current_agent="$(tr -d '[:space:]' < ai/active_agent.txt 2>/dev/null || echo "")"
if [[ "$current_agent" == "HUMAN" ]]; then
  status="$(grep "^status:" ai/user-questions.yaml 2>/dev/null | head -1 | sed "s/^status:[[:space:]]*//" | tr -d "[:space:]")"
  if [[ "$status" != "answered" ]]; then
    echo "Baton is held by HUMAN. Answer ai/user-questions.yaml, then run ./scripts/resume-baton.sh."
    exit 0
  fi

  return_to="$(grep "^return_to:" ai/next_agent.yaml 2>/dev/null | head -1 | sed "s/^return_to:[[:space:]]*//" | tr -d "[:space:]")"
  if [[ -z "$return_to" || "$return_to" == "HUMAN" ]]; then
    echo "Cannot resume from HUMAN: ai/next_agent.yaml must include a non-HUMAN return_to."
    exit 1
  fi

  printf "%s\n" "$return_to" > ai/active_agent.txt
  ./scripts/generate-next-agent.sh "$return_to" --notes "Resuming baton after HUMAN answers"
  current_agent="$return_to"
  echo "Resumed baton from HUMAN to $return_to"
fi

setup_iter_branch

for ((step=1; step<=MAX_STEPS; step++)); do
  ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  current_role="$(tr -d '[:space:]' < ai/active_agent.txt 2>/dev/null || echo "")"

  prompt_file="$(resolve_prompt_file "$current_role" 2>/dev/null || true)"
  if [[ -z "$prompt_file" ]]; then
    echo "Invalid role in ai/active_agent.txt: '$current_role'"
    exit 1
  fi
  if [[ ! -f "$prompt_file" ]]; then
    echo "Prompt file for role '$current_role' not found: $prompt_file"
    exit 1
  fi

  handoff_notes="$(extract_handoff_notes || true)"
  prompt="Current role: $current_role
Source of truth: ai/active_agent.txt
Load and follow this role prompt exactly: $prompt_file
Do not route from ai/next_agent.yaml role config.
Strict terminal contract (must output exactly one when ending):
- FINISHED: HANDING TO <ROLE>
- WAITING FOR USER
- WAITING FOR BATON"
  if [[ -n "$handoff_notes" ]]; then
    prompt+=$'\n\nHandoff notes:\n'
    prompt+="$handoff_notes"
  fi

  echo "[$ts] STEP $step START role=$current_role executor=$EXECUTOR model=$MODEL" | tee -a ai/logs/baton.log

  output_last_message_file=""
  if [[ "$EXECUTOR" == "codex" ]]; then
    if [[ $DRY_RUN -eq 1 ]]; then
      output_last_message_file="OUTPUT_LAST_MESSAGE_FILE"
    else
      output_last_message_file="$(mktemp)"
    fi
  fi

  build_exec_cmd "$prompt" "$output_last_message_file"
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "DRY RUN: would invoke: ${cmd[*]}"
    exit 0
  fi

  check_cli
  step_log="$(mktemp)"
  set +e
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*) "${cmd[@]}" 2>&1 | tee "$step_log"; rc=${PIPESTATUS[0]} ;;
    *) script -q -c "$(printf '%q ' "${cmd[@]}")" "$step_log"; rc=$? ;;
  esac
  set -e

  step_log_file="ai/logs/step-$(printf '%03d' "$step")-${current_role}.log"
  cp "$step_log" "$step_log_file"

  end_ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  if [[ $rc -ne 0 ]]; then
    echo "[$end_ts] STEP $step END role=$current_role result=FAILED exit_code=$rc" | tee -a ai/logs/baton.log
    commit_step "$step" "$current_role (failed)"
    rm -f "$step_log"
    exit 1
  fi

  recent_nonempty_lines="$(awk 'NF { print }' "$step_log" | tr -d '\r' | tail -n 40)"
  final_contract_source="$recent_nonempty_lines"
  if [[ -n "$output_last_message_file" && -s "$output_last_message_file" ]]; then
    final_contract_source="$(awk 'NF { print }' "$output_last_message_file" | tr -d '\r')"
  fi

  if printf '%s\n' "$final_contract_source" | grep -Fxq "WAITING FOR BATON"; then
    echo "[$end_ts] STEP $step END role=$current_role result=WAITING_FOR_BATON" | tee -a ai/logs/baton.log
    commit_step "$step" "$current_role (waiting for baton)"
    rm -f "$step_log"
    [[ -z "$output_last_message_file" ]] || rm -f "$output_last_message_file"
    exit 0
  fi

  if printf '%s\n' "$final_contract_source" | grep -Fxq "WAITING FOR USER"; then
    if ! user_questions_waiting_for_role "$current_role"; then
      echo "[$end_ts] STEP $step END role=$current_role result=INVALID_WAITING_FOR_USER missing_or_incomplete_user_questions" | tee -a ai/logs/baton.log
      commit_step "$step" "$current_role (invalid waiting-for-user)"
      rm -f "$step_log"
      [[ -z "$output_last_message_file" ]] || rm -f "$output_last_message_file"
      echo "Agent output requested WAITING FOR USER, but ai/user-questions.yaml was not populated with a waiting question set for $current_role."
      exit 1
    fi

    ./scripts/generate-next-agent.sh HUMAN \
      --return-to "$current_role" \
      --notes "Blocked on user input from $current_role" \
      --escalated-by "$current_role" \
      --escalation-reason "Unresolved ambiguity or business-context decision required"
    printf '%s\n' "HUMAN" > ai/active_agent.txt
    echo "[$end_ts] STEP $step END role=$current_role result=WAITING_FOR_USER" | tee -a ai/logs/baton.log
    commit_step "$step" "$current_role (waiting for user)"
    rm -f "$step_log"
    [[ -z "$output_last_message_file" ]] || rm -f "$output_last_message_file"
    exit 0
  fi

  handoff_line="$(printf '%s\n' "$final_contract_source" | sed -n 's/^FINISHED: HANDING TO \([A-Z_][A-Z_]*\)$/\1/p' | tail -n 1)"
  if [[ -n "$handoff_line" ]]; then
    next_role="$handoff_line"
    found=0
    for role in $valid_roles; do
      if [[ "$role" == "$next_role" ]]; then
        found=1
        break
      fi
    done
    if [[ $found -eq 0 ]]; then
      echo "[$end_ts] STEP $step END role=$current_role result=INVALID_HANDOFF unknown_role=$next_role" | tee -a ai/logs/baton.log
      rm -f "$step_log"
      exit 1
    fi

    if [[ "$next_role" == "HUMAN" && ( "$current_role" == "ENGINEER" || "$current_role" == "VALIDATOR" ) ]]; then
      echo "[$end_ts] STEP $step END role=$current_role result=INVALID_HANDOFF direct_human_escalation_blocked" | tee -a ai/logs/baton.log
      echo "Direct handoff to HUMAN from $current_role is blocked. Escalate via PLANNER or SENIOR_JUDGMENTAL_ENGINEER."
      rm -f "$step_log"
      exit 1
    fi

    printf '%s\n' "$next_role" > ai/active_agent.txt
    ./scripts/generate-next-agent.sh "$next_role" --notes "Handoff from $current_role at $end_ts"

    if ! ./scripts/check-baton.sh >/dev/null 2>&1; then
      echo "Handoff produced invalid baton state."
      ./scripts/check-baton.sh || true
      echo "[$end_ts] STEP $step END role=$current_role result=INVALID_HANDOFF to=$next_role" | tee -a ai/logs/baton.log
      rm -f "$step_log"
      exit 1
    fi

    echo "[$end_ts] STEP $step END role=$current_role result=HANDOFF to=$next_role" | tee -a ai/logs/baton.log
    commit_step "$step" "$current_role"
    rm -f "$step_log"
    [[ -z "$output_last_message_file" ]] || rm -f "$output_last_message_file"
    [[ $FULL_AUTO -eq 1 ]] || exit 0
    continue
  fi

  echo "[$end_ts] STEP $step END role=$current_role result=INVALID_OUTPUT" | tee -a ai/logs/baton.log
  commit_step "$step" "$current_role (invalid output)"
  rm -f "$step_log"
  [[ -z "$output_last_message_file" ]] || rm -f "$output_last_message_file"
  echo "Agent output did not include a valid terminal contract line."
  echo "Expected one of:"
  echo "  FINISHED: HANDING TO <ROLE>"
  echo "  WAITING FOR USER"
  echo "  WAITING FOR BATON"
  exit 1
done

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] REACHED_MAX_STEPS ($MAX_STEPS)" | tee -a ai/logs/baton.log
commit_step "final" "max-steps-reached"
