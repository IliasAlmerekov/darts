#!/usr/bin/env bash
# Package two built images and their release metadata into one release archive.
#
# Usage: deploy/package-release.sh <output-dir>
#
# Required environment:
#   RELEASE_TAG     bare semver tag, for example 0.1.0
#   COMMIT_SHA      40-character frontend commit the tag points to
#   RUN_ID          numeric CI run id (any number for a local build)
#   APP_HOSTNAME    public hostname Caddy serves
#   FRONTEND_IMAGE  darts-frontend:<tag>, already present in the local Docker daemon
#   BACKEND_IMAGE   darts-backend:<tag>-<short sha>, already present in the local Docker daemon
#
# Prints the archive path on stdout. The archive holds release.env, images.tar.gz
# and images.sha256 at its top level. compose.yaml and Caddyfile never travel in
# a release: init-server.sh installs them on the server, owned by root.
set -euo pipefail

die() { echo "package-release: $*" >&2; exit 1; }

(( $# == 1 )) || die 'usage: package-release.sh <output-dir>'
out_dir=$1

deploy_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
semver_re='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'

: "${RELEASE_TAG:?Set RELEASE_TAG}" "${COMMIT_SHA:?Set COMMIT_SHA}" "${RUN_ID:?Set RUN_ID}"
: "${APP_HOSTNAME:?Set APP_HOSTNAME}" "${FRONTEND_IMAGE:?Set FRONTEND_IMAGE}" "${BACKEND_IMAGE:?Set BACKEND_IMAGE}"

[[ $RELEASE_TAG =~ $semver_re ]] || die "RELEASE_TAG is not bare semver: $RELEASE_TAG"
[[ $COMMIT_SHA =~ ^[0-9a-f]{40}$ ]] || die 'COMMIT_SHA must be 40 lowercase hex characters.'
[[ $RUN_ID =~ ^[0-9]+$ ]] || die 'RUN_ID must be numeric.'
[[ $APP_HOSTNAME =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]] || die "APP_HOSTNAME is not a hostname: $APP_HOSTNAME"
[[ $FRONTEND_IMAGE =~ ^darts-frontend:[A-Za-z0-9._-]+$ ]] || die "Unexpected FRONTEND_IMAGE: $FRONTEND_IMAGE"
[[ $BACKEND_IMAGE =~ ^darts-backend:[A-Za-z0-9._-]+$ ]] || die "Unexpected BACKEND_IMAGE: $BACKEND_IMAGE"

backend_ref=$(tr -d '[:space:]' < "$deploy_dir/backend-ref")
[[ $backend_ref =~ ^[0-9a-f]{40}$ ]] || die 'deploy/backend-ref must hold one 40-character commit SHA.'

for image in "$FRONTEND_IMAGE" "$BACKEND_IMAGE"; do
    docker image inspect "$image" > /dev/null || die "Image not found locally: $image"
done

release_name="$RELEASE_TAG-$COMMIT_SHA-$RUN_ID"
archive_name="darts-release-$release_name.tar.gz"

mkdir -p -- "$out_dir"
out_dir=$(cd -- "$out_dir" && pwd)
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT

cat > "$work/release.env" <<EOF
APP_HOSTNAME=$APP_HOSTNAME
FRONTEND_IMAGE=$FRONTEND_IMAGE
BACKEND_IMAGE=$BACKEND_IMAGE
SECRETS_DIR=/opt/darts/secrets
RELEASE_TAG=$RELEASE_TAG
BACKEND_REF=$backend_ref
EOF

echo "Saving $FRONTEND_IMAGE and $BACKEND_IMAGE" >&2
docker save "$FRONTEND_IMAGE" "$BACKEND_IMAGE" | gzip -n -6 > "$work/images.tar.gz"

(cd "$work" && sha256sum release.env images.tar.gz > images.sha256)

tar -C "$work" --owner=0 --group=0 --numeric-owner --mode='u=rw,go=r' \
    -czf "$out_dir/$archive_name" \
    release.env images.tar.gz images.sha256

echo "$out_dir/$archive_name"
