#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

set -a
# shellcheck disable=SC1091
source "$ROOT/.env.production"
set +a

BASE="https://ziwei-ai-report.vercel.app"
EMAIL="ms0223900@gmail.com"

if [[ -z "${MEMBERSHIP_GRANT_SECRET:-}" ]]; then
  echo "MEMBERSHIP_GRANT_SECRET missing in .env.production" >&2
  exit 1
fi

curl -sS -D - -X POST "$BASE/api/dev/grant-access" \
  -H "Authorization: Bearer $MEMBERSHIP_GRANT_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}"
echo
