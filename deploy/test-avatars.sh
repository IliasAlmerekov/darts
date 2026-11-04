#!/usr/bin/env bash
# Run as root on Linux with bash, coreutils, util-linux and acl installed.
# All writes stay in a temporary tree; Docker is replaced at the command boundary.
set -euo pipefail

[[ $(id -u) == 0 ]] || { echo 'Run this test as root in a disposable container.' >&2; exit 1; }
for tool in setpriv setfacl python3; do
    command -v "$tool" > /dev/null || { echo "$tool is required." >&2; exit 1; }
done
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
fixture=$(mktemp -d)
readonly script_dir fixture
trap 'rm -rf -- "$fixture"' EXIT
chmod 0755 "$fixture"
mkdir "$fixture/bin"
cat > "$fixture/bin/docker" <<'SH'
#!/usr/bin/env bash
echo "$1 AVATAR_HOST_DIR=${AVATAR_HOST_DIR-unset}" >> "$CALL_LOG"
[[ $1 != load ]] || exit 0
exit 70
SH
chmod 0755 "$fixture/bin/docker"
export PATH="$fixture/bin:$PATH"
export CALL_LOG="$fixture/calls"
# Compose must ignore this inherited value in favor of the validated file.
export AVATAR_HOST_DIR=/missing-shell-override

assert_gate() {
    local script=$1 expected=$2 output status
    : > "$CALL_LOG"
    status=0
    if [[ $script == rollout ]]; then
        output=$(bash "$fixture/$script.sh" "$base/incoming/darts-release-1.0.0-$(printf '%040d' 0)-1.tar.gz" 2>&1) || status=$?
    else
        output=$(bash "$fixture/$script.sh" --schema-compatible 2>&1) || status=$?
    fi
    if [[ $expected == allow ]]; then
        if [[ $script == rollout ]]; then
            # A deliberately absent archive is the first check after avatar preflight.
            [[ $status == 1 && $output == *'The archive is not a regular file.'* ]] ||
                { echo "$script: expected avatar preflight to pass: $output" >&2; exit 1; }
            [[ ! -s $CALL_LOG ]] || { echo 'Unexpected Docker call.' >&2; exit 1; }
        else
            [[ $status == 70 && $(cat "$CALL_LOG") == 'compose AVATAR_HOST_DIR=unset' ]] ||
                { echo "$script: expected Compose with no inherited avatar path: $output" >&2; exit 1; }
        fi
    else
        [[ $status == 1 && $output == *"$expected"* && ! -s $CALL_LOG ]] ||
            { echo "$script: expected rejection before Docker ($expected): $output" >&2; exit 1; }
    fi
}

for script in rollout rollback; do
    base=$fixture/$script
    mkdir -p "$base"/{config,secrets,releases/previous,incoming,avatars}
    chmod 0755 "$base" "$base/avatars"
    touch "$base/config/compose.yaml" "$base/config/Caddyfile"
    touch "$base/secrets/"{app_secret,mysql_password,mysql_root_password}
    touch "$base/releases/previous/release.env"
    ln -s "$base/releases/previous" "$base/previous"
    # Run the complete production script, changing only its fixed installation path.
    sed "s|^readonly base=/opt/darts$|readonly base=$base|" "$script_dir/$script.sh" > "$fixture/$script.sh"
    avatars_env=$base/config/avatars.env
    printf 'AVATAR_HOST_DIR=%s\n' "$base/avatars" > "$avatars_env"
    chmod 0644 "$avatars_env"

    assert_gate "$script" allow
    chmod 0700 "$base/avatars"
    assert_gate "$script" 'not readable and searchable'
    chmod 0744 "$base/avatars"
    assert_gate "$script" 'not readable and searchable'
    chmod 0711 "$base/avatars"
    assert_gate "$script" 'not readable and searchable'

    # A named ACL can grant access to an otherwise closed root-owned directory.
    chmod 0700 "$base/avatars"
    setfacl -m u:10001:rx "$base/avatars"
    assert_gate "$script" allow
    # A named ACL can also deny access despite readable/searchable other bits.
    setfacl -b "$base/avatars"
    chmod 0755 "$base/avatars"
    setfacl -m u:10001:--- "$base/avatars"
    assert_gate "$script" 'not readable and searchable'
    setfacl -b "$base/avatars"

    # Bind mounting the child bypasses search permissions on host parents.
    mkdir -p "$base/closed/avatars"
    chmod 0700 "$base/closed"
    chmod 0755 "$base/closed/avatars"
    printf 'AVATAR_HOST_DIR=%s\n' "$base/closed/avatars" > "$avatars_env"
    assert_gate "$script" allow
    chmod 0700 "$base/closed/avatars"
    assert_gate "$script" 'not readable and searchable'

    printf 'AVATAR_HOST_DIR=%s\n' "$base/missing" > "$avatars_env"
    assert_gate "$script" 'not an existing directory'
    [[ ! -e $base/missing ]] || { echo 'Preflight created a missing folder.' >&2; exit 1; }
    printf 'AVATAR_HOST_DIR=%s\n' "$base/avatars" > "$avatars_env"
    chmod 0664 "$avatars_env"
    assert_gate "$script" 'writable by group or others'
    chmod 0644 "$avatars_env"
    chown 10001:10001 "$avatars_env"
    assert_gate "$script" 'not owned by root'
    chown 0:0 "$avatars_env"
    printf 'AVATAR_HOST_DIR=%s\nAVATAR_HOST_DIR=%s\n' "$base/avatars" "$base/avatars" > "$avatars_env"
    assert_gate "$script" 'Duplicate avatars.env key'
    printf 'OTHER_KEY=/tmp\n' > "$avatars_env"
    assert_gate "$script" 'Unknown avatars.env key'
    printf 'AVATAR_HOST_DIR=relative/path\n' > "$avatars_env"
    assert_gate "$script" 'must be an absolute path'
    : > "$avatars_env"
    assert_gate "$script" 'lacks AVATAR_HOST_DIR'
    mv "$avatars_env" "$avatars_env.real"
    ln -s "$avatars_env.real" "$avatars_env"
    assert_gate "$script" 'not a regular file'
    rm "$avatars_env"
    assert_gate "$script" 'is missing'
    echo "$script: all 17 avatar preflight cases passed"

    if [[ $script == rollout ]]; then
        # A valid archive reaches Compose after the real archive/checksum/tag checks.
        printf 'AVATAR_HOST_DIR=%s\n' "$base/avatars" > "$avatars_env"
        mkdir "$base/package"
        (
            cd "$base/package"
            printf '[{"RepoTags":["darts-frontend:1.0.0","darts-backend:1.0.0"]}]\n' > manifest.json
            tar -czf images.tar.gz manifest.json
            printf '%s\n' 'APP_HOSTNAME=example.com' 'FRONTEND_IMAGE=darts-frontend:1.0.0' \
                'BACKEND_IMAGE=darts-backend:1.0.0' "SECRETS_DIR=$base/secrets" \
                'RELEASE_TAG=1.0.0' "BACKEND_REF=$(printf '%040d' 0)" > release.env
            sha256sum images.tar.gz release.env > images.sha256
            tar -czf "$base/incoming/darts-release-1.0.0-$(printf '%040d' 0)-1.tar.gz" \
                images.sha256 images.tar.gz release.env
        )
        : > "$CALL_LOG"
        status=0
        output=$(bash "$fixture/rollout.sh" "$base/incoming/darts-release-1.0.0-$(printf '%040d' 0)-1.tar.gz" 2>&1) || status=$?
        [[ $status == 70 && $(cat "$CALL_LOG") == $'load AVATAR_HOST_DIR=/missing-shell-override\ncompose AVATAR_HOST_DIR=unset' ]] ||
            { echo "rollout: expected Compose with no inherited avatar path: $output" >&2; exit 1; }
        echo 'rollout: Compose ignores the inherited avatar path'
    fi
done
