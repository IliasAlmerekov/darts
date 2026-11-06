# Workspace paths

Read this before crossing repositories or using the shared Compose stack from a worktree.
Run from the current repository:

```bash
git rev-parse --path-format=absolute --git-common-dir
```

The parent of that repository's common `.git` directory is its main checkout. The parent
of the main checkout is the shared workspace. Resolve `dartsapp` and `dartsapp-backend`
there, and verify each exists. If a paired feature worktree is supplied, use that explicit
path for branch-specific contracts instead. Do not infer siblings from the current worktree.

For a frontend contract refresh, set `frontend_checkout` to the absolute current frontend
worktree and `workspace_dir` to the resolved shared workspace. Verify both paths, then run:

```bash
(
  set -eu
  dump_file=$(mktemp "$frontend_checkout/docs/backend-api-contract.json.XXXXXX")
  trap 'rm -f "$dump_file"' EXIT
  docker compose --project-directory "$workspace_dir" exec -T -w /var/www/html php php bin/console nelmio:apidoc:dump > "$dump_file"
  node -e 'JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"))' "$dump_file"
  mv "$dump_file" "$frontend_checkout/docs/backend-api-contract.json"
)
```

The dump replaces the contract only after the command succeeds and its output parses as
JSON. A failed command or malformed output leaves the existing contract intact.
RTK is optional; local command-wrapper policies still apply. Use passthrough for JSON stdout.

The shared PHP service serves the main backend
checkout; verify that its code matches the intended contract before refreshing. For a
backend feature worktree, first change into that backend checkout, then run
`scripts/php.sh php bin/console nelmio:apidoc:dump` in place of the Docker command above.
Keep the temporary-file validation and replacement steps for either service.
