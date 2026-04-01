#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

errors=0
valid_roles="PLANNER SENIOR_JUDGMENTAL_ENGINEER ENGINEER VALIDATOR HUMAN"

required_files=(
  "ai/active_agent.txt"
  "ai/goal.yaml"
  "ai/judgment.yaml"
  "ai/constitution.yaml"
  "ai/backlog.yaml"
  "ai/active_item.yaml"
  "ai/decision-lock.yaml"
  "ai/user-questions.yaml"
  "ai/requirements.md"
  "ai/iterations/ITER-0001.md"
)

echo "=== File existence ==="
for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "  FAIL: missing $file"
    errors=$((errors + 1))
  else
    echo "  OK:   $file"
  fi
done

echo ""
echo "=== Active agent ==="

if [[ ! -s ai/active_agent.txt ]]; then
  echo "  FAIL: ai/active_agent.txt is empty"
  errors=$((errors + 1))
else
  agent="$(tr -d '[:space:]' < ai/active_agent.txt)"
  found=0
  for role in $valid_roles; do
    if [[ "$agent" == "$role" ]]; then
      found=1
      break
    fi
  done
  if [[ $found -eq 0 ]]; then
    echo "  FAIL: invalid active agent '$agent'"
    echo "        must be one of: $valid_roles"
    errors=$((errors + 1))
  else
    echo "  OK:   active agent is $agent"
  fi
fi

echo ""
echo "=== YAML validation ==="

yaml_files=(
  "ai/goal.yaml"
  "ai/judgment.yaml"
  "ai/constitution.yaml"
  "ai/backlog.yaml"
  "ai/active_item.yaml"
  "ai/decision-lock.yaml"
  "ai/user-questions.yaml"
)

if ! command -v python3 >/dev/null 2>&1; then
  echo "  WARN: python3 not found, skipping YAML structure validation"
else
  for yf in "${yaml_files[@]}"; do
    [[ -f "$yf" ]] || continue
    set +e
    result="$(python3 "$ROOT/scripts/validate_baton.py" "$yf" 2>&1)"
    rc=$?
    set -e
    if [[ $rc -ne 0 ]]; then
      if echo "$result" | grep -q "ModuleNotFoundError: No module named 'yaml'"; then
        echo "  WARN: $yf skipped (PyYAML not installed)"
      else
        echo "  FAIL: $yf validation failed"
        echo "  $result"
        errors=$((errors + 1))
      fi
    elif echo "$result" | grep -q "^FAIL"; then
      echo "  $result"
      errors=$((errors + 1))
    else
      echo "  $result"
    fi
  done
fi

echo ""
echo "=== next_agent.yaml (optional minimal baton) ==="

if [[ -f ai/next_agent.yaml ]]; then
  if command -v python3 >/dev/null 2>&1; then
    set +e
    result="$(python3 "$ROOT/scripts/validate_baton.py" ai/next_agent.yaml 2>&1)"
    rc=$?
    set -e
  else
    result="WARN: python3 not found, skipping next_agent schema validation"
    rc=0
  fi

  if [[ $rc -ne 0 ]]; then
    if echo "$result" | grep -q "ModuleNotFoundError: No module named 'yaml'"; then
      echo "  WARN: ai/next_agent.yaml skipped (PyYAML not installed)"
    else
      echo "  FAIL: ai/next_agent.yaml validation failed"
      echo "  $result"
      errors=$((errors + 1))
    fi
  elif echo "$result" | grep -q "^FAIL"; then
    echo "  $result"
    errors=$((errors + 1))
  else
    echo "  $result"
  fi

  next_role="$(sed -n 's/^next_role:[[:space:]]*//p' ai/next_agent.yaml | head -1 | tr -d '[:space:]')"
  if [[ -z "$next_role" ]]; then
    echo "  FAIL: ai/next_agent.yaml missing next_role"
    errors=$((errors + 1))
  else
    found=0
    for role in $valid_roles; do
      [[ "$next_role" == "$role" ]] && found=1 && break
    done
    if [[ $found -eq 0 ]]; then
      echo "  FAIL: ai/next_agent.yaml next_role '$next_role' is invalid"
      errors=$((errors + 1))
    else
      echo "  OK:   next_role is $next_role"
    fi
  fi

  return_to="$(sed -n 's/^return_to:[[:space:]]*//p' ai/next_agent.yaml | head -1 | tr -d '[:space:]')"
  if [[ -n "$return_to" ]]; then
    found=0
    for role in $valid_roles; do
      [[ "$return_to" == "$role" ]] && found=1 && break
    done
    if [[ $found -eq 0 || "$return_to" == "HUMAN" ]]; then
      echo "  FAIL: return_to '$return_to' must be a non-HUMAN valid role"
      errors=$((errors + 1))
    else
      echo "  OK:   return_to is $return_to"
    fi
  fi

  escalated_by="$(sed -n 's/^escalated_by:[[:space:]]*//p' ai/next_agent.yaml | head -1 | tr -d '[:space:]')"
  if [[ -n "$escalated_by" ]]; then
    found=0
    for role in $valid_roles; do
      [[ "$escalated_by" == "$role" ]] && found=1 && break
    done
    if [[ $found -eq 0 ]]; then
      echo "  FAIL: escalated_by '$escalated_by' must be a valid role"
      errors=$((errors + 1))
    else
      echo "  OK:   escalated_by is $escalated_by"
    fi
  fi
else
  echo "  OK:   ai/next_agent.yaml not present (runner can proceed from active_agent only)"
fi

echo ""
if [[ $errors -ne 0 ]]; then
  echo "Baton check FAILED ($errors error(s))"
  exit 1
fi

echo "Baton check OK"
