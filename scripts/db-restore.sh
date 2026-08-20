#!/usr/bin/env bash
# Loads a backup into the LOCAL Postgres container -- never into Neon.
#
# Restoring is destructive, so the target is hardcoded to the local container
# and the existing local schema is dropped first. Pointing this at the live
# database would be a mistake you could not undo, so it simply cannot.
set -euo pipefail

cd "$(dirname "$0")/.."

CONTAINER="${PG_CONTAINER:-gymfit_db}"
LOCAL_USER="${PG_USER:-gymfit}"
LOCAL_DB="${PG_DB:-gymfit_local}"

DUMP="${1:-}"
if [ -z "$DUMP" ]; then
  echo "Usage: pnpm db:restore <backup.sql>" >&2
  echo "Most recent backups:" >&2
  ls -1t backups/*.sql 2>/dev/null | head -5 >&2 || echo "  (none in backups/)" >&2
  exit 1
fi

if [ ! -f "$DUMP" ]; then
  echo "No such file: $DUMP" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Container '$CONTAINER' is not running -- start it with: docker compose up -d" >&2
  exit 1
fi

echo "This REPLACES everything in the local database '$LOCAL_DB' with $DUMP."
printf 'Type the database name to confirm: '
read -r CONFIRM
if [ "$CONFIRM" != "$LOCAL_DB" ]; then
  echo "Aborted." >&2
  exit 1
fi

docker exec -i "$CONTAINER" psql -U "$LOCAL_USER" -d "$LOCAL_DB" -v ON_ERROR_STOP=1 \
  -c 'DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;'

docker exec -i "$CONTAINER" psql -U "$LOCAL_USER" -d "$LOCAL_DB" -v ON_ERROR_STOP=1 -q < "$DUMP"

echo "Restored $DUMP into local '$LOCAL_DB'."
