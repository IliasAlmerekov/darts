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
readonly avatars_env=$config/avatars.env

die() { echo "rollback: $*" >&2; exit 1; }

# Server-side settings that CI must not choose. Root writes avatars.env (init-server.sh);
# parse it strictly instead of sourcing it.
check_avatars_env() {
    local line key value seen=''
    [[ -e $avatars_env || -L $avatars_env ]] ||
        die "$avatars_env is missing. Run init-server.sh, or create it with AVATAR_HOST_DIR=<absolute path>."
    [[ ! -L $avatars_env && -f $avatars_env ]] || die "$avatars_env is not a regular file."
    [[ $(stat -c '%u' -- "$avatars_env") == 0 ]] || die "$avatars_env is not owned by root."
    (( (8#$(stat -c '%a' -- "$avatars_env") & 8#022) == 0 )) || die "$avatars_env is writable by group or others."
    while IFS= read -r line || [[ -n $line ]]; do
        [[ $line =~ ^([A-Z_]+)=(.*)$ ]] || die "Bad avatars.env line: $line"
        key=${BASH_REMATCH[1]} value=${BASH_REMATCH[2]}
        [[ $key == AVATAR_HOST_DIR ]] || die "Unknown avatars.env key: $key"
        [[ -z $seen ]] || die 'Duplicate avatars.env key: AVATAR_HOST_DIR'
        [[ $value =~ ^/[A-Za-z0-9._/-]+$ ]] || die 'AVATAR_HOST_DIR in avatars.env must be an absolute path.'
        seen=1
    done < "$avatars_env"
    [[ -n $seen ]] || die "$avatars_env lacks AVATAR_HOST_DIR."
}

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
check_avatars_env
docker compose --project-directory "$config" --env-file "$target/release.env" --env-file "$avatars_env" \
    -f "$config/compose.yaml" up -d --wait --wait-timeout 300 --remove-orphans
hostname=$(sed -n 's/^APP_HOSTNAME=//p' "$target/release.env")
curl --fail --silent --show-error --retry 12 --retry-delay 5 --retry-all-errors \
    --resolve "$hostname:443:127.0.0.1" "https://$hostname/api/health" > /dev/null
ln -sfn -- "$target" "$base/current"
echo "Release ${target##*/} restored. The database schema was not changed."
