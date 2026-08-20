#!/usr/bin/env bash
# Dumps the live database (DATABASE_URL) to a timestamped file in backups/.
#
# pg_dump refuses to dump a server newer than itself, and Neon upgrades its
# Postgres without asking us. So the server's major version is read first and
# pg_dump is run from a matching postgres image, rather than trusting whatever
# client happens to be installed.
set -euo pipefail

cd "$(dirname "$0")/.."

BACKUP_DIR="backups"

DATABASE_URL="$(grep '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')"
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set in .env.local" >&2
  exit 1
fi

MAJOR="$(psql "$DATABASE_URL" -t -A -c 'SHOW server_version_num' | cut -c1-2)"
if ! [[ "$MAJOR" =~ ^[0-9]+$ ]]; then
  echo "Could not read the server version -- is the database reachable?" >&2
  exit 1
fi
IMAGE="postgres:${MAJOR}-alpine"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y-%m-%d-%H%M%S)"
OUT="$BACKUP_DIR/gymfit-$STAMP.sql"
TMP="$(mktemp)"
# A half-written dump must never be left looking like a usable backup.
trap 'rm -f "$TMP"' EXIT

echo "Dumping with $IMAGE ..."
docker run --rm -e PGURL="$DATABASE_URL" "$IMAGE" \
  sh -c 'pg_dump "$PGURL" --no-owner --no-privileges' > "$TMP"

if [ ! -s "$TMP" ]; then
  echo "pg_dump produced an empty file -- refusing to write a backup." >&2
  exit 1
fi
if ! grep -q '^COPY ' "$TMP"; then
  echo "Dump contains no data rows -- refusing to write a backup." >&2
  exit 1
fi

mv "$TMP" "$OUT"
trap - EXIT
echo "Wrote $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes, $(grep -c '^COPY ' "$OUT") tables)"
echo "Load it into local Postgres with: pnpm db:restore $OUT"
