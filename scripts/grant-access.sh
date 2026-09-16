#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <email>" >&2
  exit 1
}

EMAIL="${1:-}"
[[ -n "$EMAIL" ]] || usage

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

set -a
# shellcheck disable=SC1091
source "$ROOT/.env.production"
set +a

BASE="https://ziwei-ai-report.vercel.app"

if [[ -z "${MEMBERSHIP_GRANT_SECRET:-}" ]]; then
  echo "MEMBERSHIP_GRANT_SECRET missing in .env.production" >&2
  exit 1
fi

curl -sS -D - -X POST "$BASE/api/dev/grant-access" \
  -H "Authorization: Bearer $MEMBERSHIP_GRANT_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}"
echo
