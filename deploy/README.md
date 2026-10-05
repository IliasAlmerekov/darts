# Production deployment

One Azure VM runs four containers: Caddy, the frontend (nginx), the backend (PHP-FPM) and
MySQL. GitHub Actions builds both images, packs them into one archive, copies it to the VM
over SSH and runs the rollout there. The VM never builds images and never pulls the app
images from a registry. Caddy and MySQL images come from Docker Hub.

## Files

| File                  | Purpose                                                              |
| --------------------- | -------------------------------------------------------------------- |
| `compose.yaml`        | Production stack. Project name `darts-production`. Server copy only. |
| `Caddyfile`           | TLS and routing. `/api` and `/api/*` go to the backend. Server only. |
| `frontend.Dockerfile` | Frontend image (Vite build served by nginx).                         |
| `backend-ref`         | Backend commit that every release builds.                            |
| `package-release.sh`  | Packs built images and `release.env` into the release archive.       |
| `init-server.sh`      | One-time server setup. Safe to re-run.                               |
| `rollout.sh`          | Installed as `/opt/darts/bin/rollout`. Deploys one archive.          |
| `rollback.sh`         | Installed as `/opt/darts/bin/rollback`. Starts the previous release. |

## Release archive

CI uploads `darts-release-<tag>-<commit>-<run id>.tar.gz` to `/opt/darts/incoming`. It holds:

- `release.env`: `APP_HOSTNAME`, `FRONTEND_IMAGE`, `BACKEND_IMAGE`,
  `SECRETS_DIR=/opt/darts/secrets`, `RELEASE_TAG`, `BACKEND_REF`
- `images.tar.gz`: `docker save` of `darts-frontend:<tag>` and
  `darts-backend:<tag>-<first 12 characters of backend-ref>`
- `images.sha256`: checksums of `release.env` and `images.tar.gz`

The rollout rejects an archive with any other member, including `compose.yaml` or
`Caddyfile`. The stack definition lives only in `/opt/darts/config` on the server, owned
by root. The rollout runs:

```sh
docker compose --project-directory /opt/darts/config \
  --env-file /opt/darts/releases/<release>/release.env -f /opt/darts/config/compose.yaml ...
```

The rollout extracts it into `/opt/darts/releases/<tag>-<commit>-<run id>` and points
`/opt/darts/current` at it. `/opt/darts/previous` points at the release before.

## One-time server setup

1. Create a deploy key pair on your machine. Keep the private key out of the repository.

   ```sh
   ssh-keygen -t ed25519 -N '' -C darts-deploy@github -f ./darts-deploy
   ```

2. Copy the scripts, `compose.yaml`, `Caddyfile` and the public key to the VM and run
   the setup as `azureuser`:

   ```sh
   ssh azureuser@dartsapp.swedencentral.cloudapp.azure.com mkdir -p darts-setup
   scp deploy/init-server.sh deploy/rollout.sh deploy/rollback.sh \
     deploy/compose.yaml deploy/Caddyfile ./darts-deploy.pub \
     azureuser@dartsapp.swedencentral.cloudapp.azure.com:darts-setup/
   ssh azureuser@dartsapp.swedencentral.cloudapp.azure.com
   cd darts-setup && sudo ./init-server.sh "$(cat darts-deploy.pub)"
   ```

The script creates:

- user `darts-deploy`: no password, not in the `docker` group, home owned by root.
  Its `authorized_keys` line carries `restrict`, so no shell TTY and no forwarding.
- `/opt/darts/incoming`: the only directory `darts-deploy` can write to.
- `/opt/darts/{bin,releases,config}` owned by root, and `/opt/darts/secrets` (mode 0700).
- `/opt/darts/config/compose.yaml` and `/opt/darts/config/Caddyfile`, root-owned, mode 0644.
- `app_secret`, `mysql_password` and `mysql_root_password`, only if they do not exist yet.
- `/opt/darts/bin/rollout` and `/opt/darts/bin/rollback`, root-owned, mode 0755.
- `/etc/sudoers.d/darts-deploy`, checked with `visudo -cf`. It allows only
  `sudo /opt/darts/bin/rollout /opt/darts/incoming/*`. The script checks the argument again.

## Changing compose.yaml, the Caddyfile or the scripts

A release archive never carries `compose.yaml`, `Caddyfile`, `rollout.sh` or
`rollback.sh`. After you change any of them, copy the new files to `darts-setup/` as in
step 2 and run `sudo ./init-server.sh "$(cat darts-deploy.pub)"` again. It replaces the
installed copies and keeps the secrets.

The next rollout or rollback uses the new stack definition. To apply it to the running
release at once:

```sh
sudo docker compose --project-directory /opt/darts/config \
  --env-file /opt/darts/current/release.env -f /opt/darts/config/compose.yaml \
  up -d --wait --remove-orphans
```

Keep `name: darts-production` in `compose.yaml`; `init-server.sh` refuses any other
project name, because a new name would start with empty volumes.

## GitHub settings

Create the `production` environment and add a required reviewer if you want to approve
each deploy. Then set (do not commit the key):

```sh
gh api -X PUT repos/IliasAlmerekov/darts/environments/production
gh secret set DEPLOY_SSH_KEY --env production < ./darts-deploy
ssh-keyscan -t ed25519 dartsapp.swedencentral.cloudapp.azure.com > known_hosts
# Compare the fingerprint with `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` on the VM.
gh secret set DEPLOY_KNOWN_HOSTS --env production < known_hosts
gh variable set DEPLOY_HOST --env production --body dartsapp.swedencentral.cloudapp.azure.com
gh variable set DEPLOY_USER --env production --body darts-deploy
gh variable set APP_HOSTNAME --body dartsapp.swedencentral.cloudapp.azure.com
```

`APP_HOSTNAME` is a repository variable because the build job writes it into
`release.env`, and that job does not use the `production` environment.

Delete `./darts-deploy` from your machine once the secret is set.

## Release

Push a bare semver tag from the commit you want to ship:

```sh
git tag 0.1.0
git push origin 0.1.0
```

`.github/workflows/release.yml` then runs:

1. `npm run validate:push`.
2. Builds both images for linux/amd64. The backend comes from `darts-backend` at the
   commit in `backend-ref`. Trivy prints HIGH and CRITICAL findings and fails the run on
   CRITICAL findings that have a fix.
3. Uploads the archive and runs `/opt/darts/bin/rollout` on the VM. Only one deploy runs
   at a time.

The rollout loads the images, starts MySQL, stops the old proxy and backend, runs the
migrations, starts the new stack and checks `https://<APP_HOSTNAME>/api/health` and `/`
on the VM. If a step fails after the old release was stopped, it starts the old release
again. Then it keeps the current and previous release directories and their images, and
deletes older ones.

A tag like `v0.1.0` or `0.1.0-rc.1` does not start the workflow.

## First administrator

The command needs an interactive terminal:

```sh
sudo docker compose --project-directory /opt/darts/config \
  --env-file /opt/darts/current/release.env -f /opt/darts/config/compose.yaml \
  run --rm backend php bin/console app:create-admin
```

## Rollback

Migrations are not reverted. Check that the previous release works with the current
schema, then run:

```sh
sudo /opt/darts/bin/rollback --schema-compatible
```

This starts the release in `/opt/darts/previous` with the server's current
`compose.yaml` and points `/opt/darts/current` at it.

## Never deleted

- Docker volumes, above all `darts-production_mysql_data`. No script runs
  `docker volume rm`, `docker compose down -v` or `docker system prune`.
- `/opt/darts/secrets`. `init-server.sh` creates missing secrets and never rewrites one.
- The current and previous release directories and their images.

There are no database backups. Anything that removes `darts-production_mysql_data`
loses all data.

## Residual risk

The CI deploy key can upload an archive and run the rollout, nothing else. It cannot
change `compose.yaml` or the `Caddyfile`, so it cannot add host mounts, privileged mode
or other services. It can still ship a malicious frontend or backend image. That image
runs inside the fixed stack: no host mounts, no extra privileges, access to the database,
the session volume and the `app_secret` and `mysql_password` secrets. Protect the deploy
key and the `production` environment reviewers accordingly.
