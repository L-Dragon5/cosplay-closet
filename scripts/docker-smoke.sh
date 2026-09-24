#!/usr/bin/env bash
# The container, proven end to end: build, boot, serve, healthcheck, then the
# migration path itself -- back up, wipe every volume, restore, and get the same
# rows and the same image back. The gate tests cannot see any of this: they run
# on SQLite and the laptop's tools.
#
# Its own compose project, ports and volumes, so it is safe beside a real stack,
# and it tears all of it down on exit.
#
#   scripts/docker-smoke.sh
set -euo pipefail
cd "$(dirname "$0")/.."

export COMPOSE_PROJECT_NAME=ccsmoke
export PORT=3098 DB_HOST_PORT=3398 MYSQL_ROOT_PASSWORD=smoke$RANDOM
unset COMPOSE_FILE
base="http://127.0.0.1:$PORT"
made=()

pass=0
ok()   { pass=$((pass + 1)); printf '  ok    %s\n' "$*"; }
fail() { printf '  FAIL  %s\n' "$*"; docker compose logs --tail 30 app || true; exit 1; }
cleanup() {
  docker compose down -v --remove-orphans >/dev/null 2>&1 || true
  for f in "${made[@]:-}"; do if [ -n "$f" ]; then rm -f "backups/$f"; fi; done
}
trap cleanup EXIT
cleanup

wait_up() {
  for _ in $(seq 1 60); do
    curl -sf "$base/api/locations" >/dev/null && return 0
    sleep 2
  done
  return 1
}
app() { docker compose exec -T app "$@"; }
# Newest backup file names the app just wrote, so cleanup can remove them.
track() { made+=($(printf '%s\n' "$1" | grep -o 'cosplay-closet-[0-9T-]*\.tar\.gz' | sort -u)); }

echo "building"
docker compose build --progress quiet >/dev/null
ok "image builds (Bun $(docker compose run --rm --no-deps -T --entrypoint bun app --version 2>/dev/null))"

echo "booting"
docker compose up -d >/dev/null 2>&1
wait_up && ok "app answers a database-backed request" || fail "app never answered"
curl -sf "$base/" | grep '<script' >/dev/null && ok "index.html is served with its bundle" || fail "no index.html"
for _ in $(seq 1 30); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q app)")" = healthy ] && break
  sleep 2
done
[ "$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q app)")" = healthy ] \
  && ok "healthcheck reports healthy" || fail "healthcheck never passed"

echo "data"
sid=$(curl -sf -X POST "$base/api/series" -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Series ラブライブ"}' | bun -e 'console.log((await Bun.stdin.json()).id)')
curl -sf -X POST "$base/api/locations" -H 'Content-Type: application/json' -d '{"name":"Bin 7"}' >/dev/null
head -c 4096 /dev/urandom > /tmp/ccsmoke.jpg
curl -sf -X POST "$base/api/series/$sid/image" -F "image=@/tmp/ccsmoke.jpg;type=image/jpeg" >/dev/null
curl -sf "$base/uploads/series/$sid.jpg" | cmp -s - /tmp/ccsmoke.jpg \
  && ok "an uploaded image is served back byte for byte" || fail "upload not served"

echo "backup"
out=$(app bun run backup 2>&1) || { echo "$out"; fail "backup failed"; }
track "$out"
archive=$(printf '%s\n' "$out" | grep -o 'backups/cosplay-closet-[0-9T-]*\.tar\.gz' | head -1)
[ -f "$archive" ] && ok "backup lands on the host: $archive" || fail "no archive on the host"
tar -tzf "$archive" | grep -x 'db.sql' >/dev/null && tar -tzf "$archive" | grep "uploads/series/$sid.jpg" >/dev/null \
  && ok "archive holds db.sql and the upload" || fail "archive is missing something"

echo "wipe"
docker compose down -v >/dev/null 2>&1
docker compose up -d >/dev/null 2>&1
wait_up || fail "app did not come back"
[ "$(curl -sf "$base/api/series")" = "[]" ] && ok "fresh volumes: no series" || fail "volumes were not wiped"
curl -s -o /dev/null -w '%{http_code}' "$base/uploads/series/$sid.jpg" | grep -x 404 >/dev/null \
  && ok "fresh volumes: no upload" || fail "upload survived the wipe"

echo "restore"
echo garbage > backups/ccsmoke-bad.tar.gz
made+=(ccsmoke-bad.tar.gz)
if bad=$(app bun run restore backups/ccsmoke-bad.tar.gz 2>&1); then fail "a garbage archive restored"; fi
track "$bad"
ok "a garbage archive is refused"
out=$(app bun run restore "$archive" 2>&1) || { echo "$out"; fail "restore failed"; }
track "$out"
printf '%s\n' "$out" | grep -x "$(printf 'series\t1')" >/dev/null \
  && ok "restore reports the row counts" || { echo "$out"; fail "no counts"; }
curl -sf "$base/api/series" | grep 'Smoke Series ラブライブ' >/dev/null \
  && ok "the series comes back, unicode intact" || fail "series not restored"
curl -sf "$base/api/locations" | grep 'Bin 7' >/dev/null && ok "the location comes back" || fail "location not restored"
curl -sf "$base/uploads/series/$sid.jpg" | cmp -s - /tmp/ccsmoke.jpg \
  && ok "the image comes back byte for byte" || fail "image not restored"
docker compose restart app >/dev/null 2>&1
wait_up && curl -sf "$base/uploads/series/$sid.jpg" | cmp -s - /tmp/ccsmoke.jpg \
  && ok "restored data survives an app restart" || fail "lost on restart"

rm -f /tmp/ccsmoke.jpg
echo "$pass checks passed"
