#!/usr/bin/env bash
# One-time VPS setup: installs the systemd user service for the backend.
# Run this once after cloning the repo on the VPS.
#
# Usage (from your local machine):
#   VPS_USER=deploy VPS_HOST=187.127.26.58 ./scripts/setup-vps.sh
set -Eeuo pipefail

VPS_USER="${VPS_USER:-}"
VPS_HOST="${VPS_HOST:-}"

if [[ -z "$VPS_USER" || -z "$VPS_HOST" ]]; then
  read -r -p "VPS SSH user: " VPS_USER
  read -r -p "VPS IP or hostname: " VPS_HOST
fi

printf '\nConnecting to %s@%s to install systemd user service...\n' "$VPS_USER" "$VPS_HOST"

ssh "$VPS_USER@$VPS_HOST" 'bash -s' << 'REMOTE'
set -Eeuo pipefail

SERVICE_DIR="$HOME/.config/systemd/user"
SERVICE_FILE="$SERVICE_DIR/query-builder.service"
REPO_SERVICE="/srv/query-builder/scripts/query-builder.service"

mkdir -p "$SERVICE_DIR"
cp "$REPO_SERVICE" "$SERVICE_FILE"

systemctl --user daemon-reload
systemctl --user enable query-builder
loginctl enable-linger "$(whoami)"

# Stop old uvicorn if still running via PID file
PID_FILE="/srv/query-builder/backend/uvicorn.pid"
if [[ -f "$PID_FILE" ]]; then
  kill "$(cat "$PID_FILE")" 2>/dev/null || true
  rm -f "$PID_FILE"
  sleep 2
fi

systemctl --user start query-builder
sleep 3
systemctl --user status query-builder --no-pager
REMOTE

printf '\nSetup complete. The backend will now auto-restart on crash and survive reboots.\n'
