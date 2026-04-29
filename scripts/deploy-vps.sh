#!/usr/bin/env bash
set -Eeuo pipefail

DEFAULT_GIT_BRANCH="${GIT_BRANCH:-master}"
DEFAULT_REMOTE_PATH="${DEFAULT_REMOTE_PATH:-/srv/query-builder}"
DEFAULT_BACKEND_RESTART_CMD="${BACKEND_RESTART_CMD:-pkill -f 'uvicorn app.main:app' || true; cd $DEFAULT_REMOTE_PATH/backend && nohup uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 > uvicorn.log 2>&1 &}"
DEFAULT_FRONTEND_RESTART_CMD="${FRONTEND_RESTART_CMD:-sudo nginx -s reload}"

prompt() {
  local label="$1"
  local default_value="${2:-}"
  local value

  if [[ -n "$default_value" ]]; then
    read -r -p "$label [$default_value]: " value
    printf '%s' "${value:-$default_value}"
  else
    read -r -p "$label: " value
    printf '%s' "$value"
  fi
}

require_value() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    printf 'Missing required value: %s\n' "$name" >&2
    exit 1
  fi
}

VPS_USER="${VPS_USER:-$(prompt "VPS SSH user")}"
VPS_HOST="${VPS_HOST:-$(prompt "VPS IP or hostname")}"
REMOTE_PATH="${REMOTE_PATH:-$(prompt "Remote project path" "$DEFAULT_REMOTE_PATH")}"
GIT_BRANCH="${GIT_BRANCH:-$(prompt "Git branch" "$DEFAULT_GIT_BRANCH")}"
BACKEND_RESTART_CMD="${BACKEND_RESTART_CMD:-$(prompt "Backend restart command" "$DEFAULT_BACKEND_RESTART_CMD")}"
FRONTEND_RESTART_CMD="${FRONTEND_RESTART_CMD:-$(prompt "Frontend restart command" "$DEFAULT_FRONTEND_RESTART_CMD")}"
RUN_TESTS="${RUN_TESTS:-0}"

require_value "VPS SSH user" "$VPS_USER"
require_value "VPS IP or hostname" "$VPS_HOST"
require_value "Remote project path" "$REMOTE_PATH"

printf -v REMOTE_PATH_Q '%q' "$REMOTE_PATH"
printf -v GIT_BRANCH_Q '%q' "$GIT_BRANCH"
printf -v RUN_TESTS_Q '%q' "$RUN_TESTS"
printf -v BACKEND_RESTART_CMD_Q '%q' "$BACKEND_RESTART_CMD"
printf -v FRONTEND_RESTART_CMD_Q '%q' "$FRONTEND_RESTART_CMD"

printf '\nConnecting to %s@%s and deploying %s\n' "$VPS_USER" "$VPS_HOST" "$REMOTE_PATH"

ssh "$VPS_USER@$VPS_HOST" \
  "cd $REMOTE_PATH_Q && git pull origin $GIT_BRANCH_Q && GIT_BRANCH=$GIT_BRANCH_Q RUN_TESTS=$RUN_TESTS_Q BACKEND_RESTART_CMD=$BACKEND_RESTART_CMD_Q FRONTEND_RESTART_CMD=$FRONTEND_RESTART_CMD_Q PULL_LATEST=0 ./scripts/deploy.sh"
