#!/usr/bin/env python3
"""Validate baton YAML files for structure and required keys."""

import sys
import yaml

REQUIRED_KEYS = {
    "ai/goal.yaml": ["project_goal", "success_criteria"],
    "ai/judgment.yaml": ["backend_default", "architecture_default"],
    "ai/constitution.yaml": ["core_rules", "baton_rules"],
    "ai/backlog.yaml": ["items"],
    "ai/active_item.yaml": ["id", "status"],
    "ai/decision-lock.yaml": ["confirmed_by_user", "blocked_on_user"],
    "ai/user-questions.yaml": ["status", "questions"],
    "ai/next_agent.yaml": ["next_role"],
}

NEXT_AGENT_ALLOWED_KEYS = {
    "next_role",
    "handoff_notes",
    "return_to",
    "escalated_by",
    "escalation_reason",
}


VALID_ROLES = {
    "PLANNER",
    "SENIOR_JUDGMENTAL_ENGINEER",
    "ENGINEER",
    "VALIDATOR",
    "HUMAN",
}


def validate(filepath):
    for suffix in REQUIRED_KEYS:
        if filepath.endswith(suffix):
            key = suffix
            break
    else:
        print(f"OK:   {filepath} (no schema to check)")
        return True

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
    except yaml.YAMLError as e:
        print(f"FAIL: {filepath} - invalid YAML: {e}")
        return False

    if data is None:
        print(f"FAIL: {filepath} - file is empty or null")
        return False

    if not isinstance(data, dict):
        print(f"FAIL: {filepath} - expected a YAML mapping, got {type(data).__name__}")
        return False

    missing = [k for k in REQUIRED_KEYS[key] if k not in data]
    if missing:
        print(f"FAIL: {filepath} - missing required keys: {', '.join(missing)}")
        return False

    if key == "ai/next_agent.yaml":
        extra = sorted(set(data.keys()) - NEXT_AGENT_ALLOWED_KEYS)
        if extra:
            print(f"FAIL: {filepath} - unsupported keys: {', '.join(extra)}")
            return False

        next_role = data.get("next_role")
        if next_role not in VALID_ROLES:
            print(f"FAIL: {filepath} - next_role must be one of: {', '.join(sorted(VALID_ROLES))}")
            return False

        return_to = data.get("return_to")
        if return_to is not None and (return_to not in VALID_ROLES or return_to == "HUMAN"):
            print("FAIL: ai/next_agent.yaml - return_to must be a non-HUMAN valid role")
            return False

        escalated_by = data.get("escalated_by")
        if escalated_by is not None and escalated_by not in VALID_ROLES:
            print("FAIL: ai/next_agent.yaml - escalated_by must be a valid role")
            return False

        if "escalation_reason" in data and "escalated_by" not in data:
            print("FAIL: ai/next_agent.yaml - escalation_reason requires escalated_by")
            return False

    print(f"OK:   {filepath}")
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: validate_baton.py <yaml-file> [<yaml-file> ...]")
        sys.exit(1)

    all_ok = True
    for path in sys.argv[1:]:
        if not validate(path):
            all_ok = False

    sys.exit(0 if all_ok else 1)
