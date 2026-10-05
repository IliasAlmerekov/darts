#!/usr/bin/env bash
# Deploy one release archive that CI uploaded to /opt/darts/incoming.
#
# Installed by init-server.sh as /opt/darts/bin/rollout (root-owned, 0755).
# The darts-deploy user may run exactly this command through sudo:
#   sudo -n /opt/darts/bin/rollout /opt/darts/incoming/darts-release-<tag>-<sha>-<run>.tar.gz
#
# The archive carries release.env and the two app images only. The stack
# definition (compose.yaml, Caddyfile) lives in /opt/darts/config, installed by
# init-server.sh and owned by root, so the CI deploy key cannot change what root
# runs through Docker.
#
# Steps: validate the archive, extract it into /opt/darts/releases/<tag>-<sha>-<run>,
# verify checksums, load the two images, run migrations, start the stack, check
# health, and move the current/previous symlinks. A failure after the previous
# release was stopped starts the previous release again. On success, release
# directories and darts images older than the previous release are removed.
# Docker volumes are never removed.
set -Eeuo pipefail
umask 022
export LC_ALL=C

readonly base=/opt/darts
readonly incoming=$base/incoming
readonly releases=$base/releases
readonly secrets=$base/secrets
readonly config=$base/config
readonly semver='(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)'
readonly release_name_re="^${semver}-[0-9a-f]{40}-[0-9]+\$"
readonly archive_re="^${incoming}/darts-release-(${semver}-[0-9a-f]{40}-[0-9]+)\\.tar\\.gz\$"
readonly members=(images.sha256 images.tar.gz release.env)

die() { echo "rollout: $*" >&2; exit 1; }

[[ $(id -u) = 0 ]] || die 'Run as root (sudo).'
(( $# == 1 )) || die 'Usage: rollout /opt/darts/incoming/darts-release-<tag>-<sha>-<run>.tar.gz'
archive=$1
[[ $archive =~ $archive_re ]] || die 'Unexpected archive path.'
release_name=${BASH_REMATCH[1]}
release_tag=${release_name%%-*}
release_dir=$releases/$release_name

exec 9> "$base/deploy.lock"
flock -n 9 || die 'Another deployment is running.'

[[ -f $secrets/app_secret && -f $secrets/mysql_password && -f $secrets/mysql_root_password ]] ||
    die 'Runtime secrets are missing. Run init-server.sh first.'

# Root must own the stack definition, and nobody else may write it.
for path in "$config" "$config/compose.yaml" "$config/Caddyfile"; do
    [[ -e $path && ! -L $path ]] || die "$path is missing. Run init-server.sh first."
    [[ $(stat -c '%u' -- "$path") == 0 ]] || die "$path is not owned by root."
    (( (8#$(stat -c '%a' -- "$path") & 8#022) == 0 )) || die "$path is writable by group or others."
done

# Run Compose with the server's stack definition and one release's variables.
# The project directory makes ./Caddyfile in compose.yaml resolve inside $config.
compose_for() {
    docker compose --project-directory "$config" --env-file "$1/release.env" -f "$config/compose.yaml" "${@:2}"
}

# The incoming directory is writable by darts-deploy. Open the file once, refuse
# symlinks, and confirm the open descriptor is the regular file the path names,
# so a swapped path cannot make root read another file.
[[ -f $archive && ! -L $archive ]] || die 'The archive is not a regular file.'
exec 3< "$archive"
[[ -f /dev/fd/3 && $(readlink /proc/self/fd/3) == "$archive" ]] || die 'The archive changed while opening it.'

staging=$(mktemp -d "$releases/.staging.XXXXXX")
cleanup() { rm -rf -- "$staging"; }
trap cleanup EXIT

cat <&3 > "$staging/release.tar.gz"
exec 3<&-
rm -f -- "$archive"

# Accept exactly the three expected regular files at the top level.
mapfile -t listed < <(tar -tzf "$staging/release.tar.gz" | sort)
[[ ${listed[*]} == "${members[*]}" ]] || die "Unexpected archive members: ${listed[*]}"
while read -r mode _; do
    [[ $mode == -* ]] || die 'The archive holds something other than regular files.'
done < <(tar -tzvf "$staging/release.tar.gz")
mkdir "$staging/release"
tar -xzf "$staging/release.tar.gz" -C "$staging/release" --no-same-owner --no-same-permissions -- "${members[@]}"
rm -f -- "$staging/release.tar.gz"

cd "$staging/release"

# Every checksum line must name one of the shipped files, and images.tar.gz must be covered.
grep -qxE '[0-9a-f]{64}  images\.tar\.gz' images.sha256 || die 'images.sha256 does not cover images.tar.gz.'
grep -qxE '[0-9a-f]{64}  release\.env' images.sha256 || die 'images.sha256 does not cover release.env.'
if grep -vxE '[0-9a-f]{64}  (release\.env|images\.tar\.gz)' images.sha256; then
    die 'images.sha256 has an unexpected line.'
fi
sha256sum --check --strict --quiet images.sha256

# Parse release.env strictly instead of sourcing it.
declare -A env=()
while IFS= read -r line || [[ -n $line ]]; do
    [[ $line =~ ^([A-Z_]+)=(.*)$ ]] || die "Bad release.env line: $line"
    key=${BASH_REMATCH[1]} value=${BASH_REMATCH[2]}
    case $key in
        APP_HOSTNAME) re='^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$' ;;
        FRONTEND_IMAGE) re='^darts-frontend:[A-Za-z0-9._-]+$' ;;
        BACKEND_IMAGE) re='^darts-backend:[A-Za-z0-9._-]+$' ;;
        SECRETS_DIR) re="^${secrets}\$" ;;
        RELEASE_TAG) re="^${release_tag//./\\.}\$" ;;
        BACKEND_REF) re='^[0-9a-f]{40}$' ;;
        *) die "Unknown release.env key: $key" ;;
    esac
    [[ $value =~ $re ]] || die "Bad release.env value for $key."
    [[ -z ${env[$key]:-} ]] || die "Duplicate release.env key: $key"
    env[$key]=$value
done < release.env
for key in APP_HOSTNAME FRONTEND_IMAGE BACKEND_IMAGE SECRETS_DIR RELEASE_TAG BACKEND_REF; do
    [[ -n ${env[$key]:-} ]] || die "release.env lacks $key."
done
hostname=${env[APP_HOSTNAME]}

# docker load would overwrite any tag the archive names (mysql, caddy, ...).
# Allow only the two images release.env declares.
python3 - "${env[FRONTEND_IMAGE]}" "${env[BACKEND_IMAGE]}" <<'PY'
import json, sys, tarfile

allowed = set(sys.argv[1:])

def short(name):
    for prefix in ("docker.io/library/", "docker.io/"):
        if name.startswith(prefix):
            return name[len(prefix):]
    return name

found = set()
with tarfile.open("images.tar.gz", "r:gz") as archive:
    names = set(archive.getnames())
    if "manifest.json" not in names:
        sys.exit("rollout: images.tar.gz has no manifest.json")
    for entry in json.load(archive.extractfile("manifest.json")):
        found.update(short(tag) for tag in entry.get("RepoTags") or [])
    if "index.json" in names:
        for manifest in json.load(archive.extractfile("index.json")).get("manifests", []):
            name = manifest.get("annotations", {}).get("io.containerd.image.name")
            if name:
                found.add(short(name))
if found != allowed:
    sys.exit(f"rollout: images.tar.gz tags {sorted(found)} differ from release.env {sorted(allowed)}")
PY

current_target=$(readlink -f "$base/current" 2>/dev/null || true)
previous_target=$(readlink -f "$base/previous" 2>/dev/null || true)
if [[ -e $release_dir ]]; then
    [[ $release_dir != "$current_target" && $release_dir != "$previous_target" ]] ||
        die "Release $release_name is already the current or previous release."
    rm -rf -- "$release_dir"
fi
cd /
mv -- "$staging/release" "$release_dir"
cd "$release_dir"

docker load --input images.tar.gz
rm -f -- images.tar.gz

compose_for "$release_dir" config --quiet
compose_for "$release_dir" up -d --wait --wait-timeout 300 mysql

previous=''
restore_previous() {
    [[ -n $previous ]] || return 0
    echo 'Rollout failed. Starting the previous release again.' >&2
    echo 'If a migration already ran, check that the previous code still works with the schema.' >&2
    compose_for "$previous" up -d --wait --wait-timeout 300 ||
        echo 'The previous release did not start.' >&2
}

# Stop traffic and release FPM memory while migrations run.
if [[ -L $base/current ]]; then
    previous=$current_target
    trap restore_previous ERR
    compose_for "$previous" stop proxy backend
fi
compose_for "$release_dir" run --rm --no-deps -T backend php -d memory_limit=128M bin/console doctrine:migrations:migrate --no-interaction
compose_for "$release_dir" run --rm --no-deps -T backend php -d memory_limit=128M bin/console doctrine:schema:validate --skip-sync
compose_for "$release_dir" up -d --wait --wait-timeout 300 --remove-orphans

# Check through Caddy on this host, with full TLS verification for the public name.
resolve=(--resolve "$hostname:443:127.0.0.1")
curl --fail --silent --show-error --retry 30 --retry-delay 5 --retry-all-errors \
    "${resolve[@]}" "https://$hostname/api/health" > /dev/null
curl --fail --silent --show-error "${resolve[@]}" "https://$hostname/" > /dev/null
trap - ERR

if [[ -n $previous ]]; then
    ln -sfn -- "$previous" "$base/previous"
fi
ln -sfn -- "$release_dir" "$base/current"
echo "Release $release_name verified. Database and session volumes were preserved."

# Retention: keep the current and previous release directories and their images.
prune_old_releases() {
    local keep_dirs=() dir ref
    declare -A keep_images=()
    keep_dirs+=("$(readlink -f "$base/current")")
    [[ -L $base/previous ]] && keep_dirs+=("$(readlink -f "$base/previous")")
    for dir in "${keep_dirs[@]}"; do
        while IFS='=' read -r key value; do
            [[ $key == FRONTEND_IMAGE || $key == BACKEND_IMAGE ]] && keep_images[$value]=1
        done < "$dir/release.env"
    done
    for dir in "$releases"/*; do
        [[ -d $dir && ! -L $dir && ${dir##*/} =~ $release_name_re ]] || continue
        [[ " ${keep_dirs[*]} " == *" $dir "* ]] && continue
        echo "Removing old release directory $dir"
        rm -rf -- "$dir"
    done
    while read -r ref; do
        [[ $ref == *:\<none\> || -n ${keep_images[$ref]:-} ]] && continue
        echo "Removing old image $ref"
        docker image rm -- "$ref" > /dev/null || echo "Could not remove image $ref" >&2
    done < <(docker image ls --format '{{.Repository}}:{{.Tag}}' \
        --filter reference='darts-frontend' --filter reference='darts-backend')
}
prune_old_releases || echo 'Retention cleanup failed; the release itself is live.' >&2
