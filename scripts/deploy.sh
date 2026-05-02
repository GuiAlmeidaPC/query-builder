#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_BRANCH="${GIT_BRANCH:-master}"
PULL_LATEST="${PULL_LATEST:-1}"
RUN_TESTS="${RUN_TESTS:-0}"
BACKEND_RESTART_CMD="${BACKEND_RESTART_CMD:-}"
FRONTEND_RESTART_CMD="${FRONTEND_RESTART_CMD:-}"

# Ensure tools installed in ~/.local/bin (e.g. uv) are available even in
# non-login SSH sessions.
export PATH="$HOME/.local/bin:$PATH"

log() {
  printf '\n==> %s\n' "$1"
}

run_restart_command() {
  local label="$1"
  local command="$2"
  local optional="${3:-0}"
  if [[ -z "$command" ]]; then
    return 0
  fi

  log "$label"
  if [[ "$optional" == "1" ]]; then
    bash -lc "$command" || printf '[warn] %s command failed (non-fatal)\n' "$label"
  else
    bash -lc "$command"
  fi
}

log "Deploying query-builder from $ROOT_DIR"
cd "$ROOT_DIR"

if [[ "$PULL_LATEST" == "1" ]]; then
  log "Pulling latest code from $GIT_REMOTE/$GIT_BRANCH"
  git pull "$GIT_REMOTE" "$GIT_BRANCH"
fi

log "Syncing backend dependencies"
cd "$BACKEND_DIR"
uv sync

if [[ "$RUN_TESTS" == "1" ]]; then
  log "Running backend tests"
  uv run pytest
fi

log "Installing frontend dependencies"
cd "$FRONTEND_DIR"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

if [[ "$RUN_TESTS" == "1" ]]; then
  log "Running frontend lint"
  npm run lint
fi

log "Building frontend"
npm run build

run_restart_command "Restarting backend" "$BACKEND_RESTART_CMD"
# Frontend restart (e.g. nginx reload) is optional — static files are served
# directly from disk so a reload is only needed when nginx config changes.
run_restart_command "Restarting frontend" "$FRONTEND_RESTART_CMD" "1"

log "Deploy complete"
