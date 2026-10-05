#!/usr/bin/env bash
# One-time (and repeatable) server setup. Run as the admin user from a directory
# that holds init-server.sh, rollout.sh, rollback.sh, compose.yaml and Caddyfile:
#   sudo ./init-server.sh "ssh-ed25519 AAAA... darts-deploy@github"
#
# Creates the darts-deploy user, its restricted SSH key, the /opt/darts tree,
# runtime secrets (only when missing), the stack definition in /opt/darts/config,
# the rollout and rollback commands, and the sudoers rule that lets darts-deploy
# run the rollout command and nothing else.
# Re-running it replaces the installed scripts, compose.yaml, Caddyfile, the key
# and the sudoers rule. That re-run is the only way a compose or Caddy change
# reaches the server; release archives never carry these files.
# It never regenerates an existing secret.
set -euo pipefail
umask 022

readonly user=darts-deploy
readonly base=/opt/darts
readonly sudoers_file=/etc/sudoers.d/darts-deploy

die() { echo "init-server: $*" >&2; exit 1; }

[[ $(id -u) = 0 ]] || die 'Run with sudo.'
(( $# == 1 )) || die 'Usage: sudo ./init-server.sh "<darts-deploy SSH public key>"'
public_key=$1
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)

command -v docker > /dev/null || die 'Docker is not installed.'
docker compose version > /dev/null || die 'The Docker Compose plugin is not installed.'
for tool in flock curl sha256sum python3 visudo ssh-keygen openssl; do
    command -v "$tool" > /dev/null || die "$tool is not installed."
done
for file in rollout.sh rollback.sh compose.yaml Caddyfile; do
    [[ -f $script_dir/$file && ! -L $script_dir/$file ]] || die "$file must sit next to init-server.sh."
done
# The project name keeps the existing volumes; a different name would start empty ones.
grep -qx 'name: darts-production' "$script_dir/compose.yaml" ||
    die 'compose.yaml must declare the project name darts-production.'
docker compose -f "$script_dir/compose.yaml" config --no-interpolate --quiet ||
    die 'compose.yaml is not a valid Compose file.'

# Accept exactly one public key line of a known type, and let ssh-keygen parse it.
[[ $public_key != *$'\n'* &&
   $public_key =~ ^(ssh-ed25519|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521|ssh-rsa)\ [A-Za-z0-9+/=]+(\ [^\"]*)?$ ]] ||
    die 'The argument is not a single SSH public key line.'
key_check=$(mktemp)
trap 'rm -f -- "$key_check"' EXIT
printf '%s\n' "$public_key" > "$key_check"
ssh-keygen -l -f "$key_check" > /dev/null || die 'ssh-keygen cannot parse the public key.'

# Deploy user: no password, no docker group, no writable home.
if ! id "$user" > /dev/null 2>&1; then
    useradd --create-home --user-group --shell /bin/bash --comment 'Darts CI deploy' "$user"
fi
usermod --password '*' "$user"
if id -nG "$user" | tr ' ' '\n' | grep -qx docker; then
    gpasswd --delete "$user" docker
fi
home=$(getent passwd "$user" | cut -d: -f6)
[[ $home == /home/$user ]] || die "Unexpected home directory for $user: $home"
# Root owns the home and the key file so the user cannot widen its own key options.
install -d -o root -g root -m 0755 "$home" "$home/.ssh"
printf 'restrict %s\n' "$public_key" > "$home/.ssh/authorized_keys.new"
chown root:root "$home/.ssh/authorized_keys.new"
chmod 0644 "$home/.ssh/authorized_keys.new"
mv -f -- "$home/.ssh/authorized_keys.new" "$home/.ssh/authorized_keys"

# Directory tree. Only incoming is writable by darts-deploy.
install -d -o root -g root -m 0755 "$base" "$base/bin" "$base/releases" "$base/config"
install -d -o root -g "$user" -m 0730 "$base/incoming"
install -d -o root -g root -m 0700 "$base/secrets"

for name in app_secret mysql_password mysql_root_password; do
    if [[ ! -e $base/secrets/$name ]]; then
        (umask 077; openssl rand -hex 32 > "$base/secrets/$name")
    fi
    # Docker mounts these files into containers running under different UIDs.
    # The containing directory remains accessible only to root on the host.
    chmod 0444 "$base/secrets/$name"
done

# Stack definition. Write each file next to its target, then rename, so a
# rollout never reads a half-written file.
for file in compose.yaml Caddyfile; do
    install -o root -g root -m 0644 "$script_dir/$file" "$base/config/.$file.new"
    mv -f -- "$base/config/.$file.new" "$base/config/$file"
done

install -o root -g root -m 0755 "$script_dir/rollout.sh" "$base/bin/rollout"
install -o root -g root -m 0755 "$script_dir/rollback.sh" "$base/bin/rollback"

# The rollout script validates its single argument itself; sudoers only narrows the prefix.
sudoers_tmp=$(mktemp)
trap 'rm -f -- "$key_check" "$sudoers_tmp"' EXIT
cat > "$sudoers_tmp" <<EOF
# Managed by init-server.sh. darts-deploy may run the rollout command only.
$user ALL=(root) NOPASSWD: $base/bin/rollout $base/incoming/*
EOF
visudo -cf "$sudoers_tmp" > /dev/null || die 'The generated sudoers rule is invalid.'
install -o root -g root -m 0440 "$sudoers_tmp" "$sudoers_file"
visudo -c > /dev/null || die 'sudoers is invalid after the change. Check /etc/sudoers.d.'

echo "Server ready. $user may upload to $base/incoming and run $base/bin/rollout."
echo "A compose.yaml or Caddyfile change takes effect with the next rollout or rollback."
