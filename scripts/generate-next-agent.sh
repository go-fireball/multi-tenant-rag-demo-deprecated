#!/usr/bin/env bash
set -euo pipefail
#
# Usage: ./scripts/generate-next-agent.sh <ROLE> [--notes "context"] [--return-to "ROLE"] [--escalated-by "ROLE"] [--escalation-reason "..."]
#
# Generates ai/next_agent.yaml with minimal baton metadata only.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ROLE=""
NOTES=""
RETURN_TO=""
ESCALATED_BY=""
ESCALATION_REASON=""

valid_roles="PLANNER SENIOR_JUDGMENTAL_ENGINEER ENGINEER VALIDATOR HUMAN"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --notes) NOTES="$2"; shift 2 ;;
    --return-to) RETURN_TO="$2"; shift 2 ;;
    --escalated-by) ESCALATED_BY="$2"; shift 2 ;;
    --escalation-reason) ESCALATION_REASON="$2"; shift 2 ;;
    --help|-h)
      echo "Usage: $0 <ROLE> [--notes \"context for next role\"] [--return-to \"ROLE\"] [--escalated-by \"ROLE\"] [--escalation-reason \"...\"]" >&2
      echo "Roles: $valid_roles" >&2
      exit 0
      ;;
    *)
      if [[ -z "$ROLE" ]]; then
        ROLE="$1"
        shift
      else
        echo "Error: unexpected argument '$1'" >&2
        exit 1
      fi
      ;;
  esac
done

if [[ -z "$ROLE" ]]; then
  echo "Usage: $0 <ROLE> [--notes \"context for next role\"] [--return-to \"ROLE\"] [--escalated-by \"ROLE\"] [--escalation-reason \"...\"]" >&2
  echo "Roles: $valid_roles" >&2
  exit 1
fi

is_valid_role() {
  local value="$1"
  for role in $valid_roles; do
    if [[ "$value" == "$role" ]]; then
      return 0
    fi
  done
  return 1
}

if ! is_valid_role "$ROLE"; then
  echo "Error: unknown role '$ROLE'" >&2
  echo "Valid roles: $valid_roles" >&2
  exit 1
fi

if [[ -n "$RETURN_TO" ]]; then
  if ! is_valid_role "$RETURN_TO" || [[ "$RETURN_TO" == "HUMAN" ]]; then
    echo "Error: --return-to must be a non-HUMAN valid role" >&2
    exit 1
  fi
fi

if [[ -n "$ESCALATED_BY" ]]; then
  if ! is_valid_role "$ESCALATED_BY"; then
    echo "Error: --escalated-by must be a valid role" >&2
    exit 1
  fi
fi

if [[ -n "$ESCALATION_REASON" && -z "$ESCALATED_BY" ]]; then
  echo "Error: --escalation-reason requires --escalated-by" >&2
  exit 1
fi

{
  echo "next_role: $ROLE"
  if [[ -n "$NOTES" ]]; then
    echo "handoff_notes: |"
    while IFS= read -r line; do
      echo "  $line"
    done <<< "$NOTES"
  fi
  if [[ -n "$RETURN_TO" ]]; then
    echo "return_to: $RETURN_TO"
  fi
  if [[ -n "$ESCALATED_BY" ]]; then
    echo "escalated_by: $ESCALATED_BY"
  fi
  if [[ -n "$ESCALATION_REASON" ]]; then
    echo "escalation_reason: |"
    while IFS= read -r line; do
      echo "  $line"
    done <<< "$ESCALATION_REASON"
  fi
} > ai/next_agent.yaml

echo "Generated ai/next_agent.yaml with next_role=$ROLE"
