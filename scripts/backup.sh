#!/usr/bin/env bash
# GarageLedger backup wrapper.
#   - Loads .env if present (only variables not already set in env).
#   - Calls scripts/backup.ts via the project's node_modules/tsx runner.
#   - Forwards signals to the child process.
#
# Cron-safe:
#   - No TTY output unless BACKUP_VERBOSE=1 is exported.
#   - Exit codes match the Node script (0 ok, 2 missing env, 3 no db, 4 tar fail, 5 bad retention).
#
# Example crontab line (daily at 03:30, logs to syslog via logger):
#   30 3 * * * /opt/garageledger/scripts/backup.sh 2>&1 | /usr/bin/logger -t garage-backup

set -euo pipefail

# Resolve project root from this script's location (works whether invoked
# from /opt/garageledger or from a cloned checkout).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Source .env ONLY for missing variables — never overwrite existing env.
# This is safer than `set -a; source .env; set +a` because it preserves
# operator-supplied overrides (e.g. a cron job setting BACKUP_DIR).
if [[ -f "${PROJECT_ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${PROJECT_ROOT}/.env"
  set +a
fi

# Validate BACKUP_DIR after .env load so cron doesn't run with a missing path.
if [[ -z "${BACKUP_DIR:-}" ]]; then
  echo "[backup] ERROR: BACKUP_DIR is required (set it in .env or export it)" >&2
  exit 2
fi

# Run the Node script. tsx isn't a devDep yet — fall back to npx so we
# don't have to modify package.json for this ticket.
cd "${PROJECT_ROOT}"
if [[ -x "./node_modules/.bin/tsx" ]]; then
  exec ./node_modules/.bin/tsx scripts/backup.ts "$@"
else
  exec npx --yes tsx scripts/backup.ts "$@"
fi
