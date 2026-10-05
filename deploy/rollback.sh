#!/usr/bin/env bash
# Start the previous release again with its own images and release.env.
#
# Installed by init-server.sh as /opt/darts/bin/rollback. An administrator runs:
#   sudo /opt/darts/bin/rollback --schema-compatible
# Migrations are not reverted, so first confirm that the previous code works
# with the current database schema. The stack definition comes from
# /opt/darts/config, the same files rollout uses.
set -euo pipefail
readonly base=/opt/darts
readonly config=$base/config

die() { echo "rollback: $*" >&2; exit 1; }

[[ $(id -u) = 0 ]] || die 'Run as root (sudo).'
[[ $# == 1 && $1 = --schema-compatible ]] ||
    die 'Review the applied migrations first, then pass --schema-compatible.'
exec 9> "$base/deploy.lock"
flock -n 9 || die 'Another deployment is running.'
[[ -L $base/previous ]] || die 'No verified previous release exists.'
target=$(readlink -f "$base/previous")
[[ ${target%/*} == "$base/releases" && -f $target/release.env ]] ||
    die 'No verified previous release exists.'
[[ -f $config/compose.yaml && -f $config/Caddyfile ]] || die "$config is incomplete. Run init-server.sh."
docker compose --project-directory "$config" --env-file "$target/release.env" -f "$config/compose.yaml" \
    up -d --wait --wait-timeout 300 --remove-orphans
hostname=$(sed -n 's/^APP_HOSTNAME=//p' "$target/release.env")
curl --fail --silent --show-error --retry 12 --retry-delay 5 --retry-all-errors \
    --resolve "$hostname:443:127.0.0.1" "https://$hostname/api/health" > /dev/null
ln -sfn -- "$target" "$base/current"
echo "Release ${target##*/} restored. The database schema was not changed."
