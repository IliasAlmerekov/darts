#!/usr/bin/env bash
# Tests the Vite server that playwright.config.ts picks: a main checkout may reuse :5173,
# a linked worktree starts its own on :5174 and never reuses one. Both cases run in a
# temporary clone, so the test works from the main checkout and from a worktree.
set -euo pipefail
# A git hook (pre-push in a worktree) exports GIT_DIR and friends; unset them so every git
# call below works on the temporary clone, never on the repository under test.
unset $(git rev-parse --local-env-vars)

root=$(cd "$(dirname "$0")/.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
unset PLAYWRIGHT_BASE_URL
mkdir -p "$tmp/bin"
# Keep the config test runnable with only the documented Node.js toolchain.
printf '#!/bin/sh\necho "unexpected standalone jq dependency" >&2\nexit 127\n' > "$tmp/bin/jq"
chmod +x "$tmp/bin/jq"
export PATH="$tmp/bin:$PATH"

fail() { echo "test-playwright-port: $*" >&2; exit 1; }
prepare() {
  cp "$root/playwright.config.ts" "$1/"
  ln -s "$root/node_modules" "$1/node_modules"
}
server() {
  (cd "$1" && npx playwright test --list --project=mocked --reporter=json 2>/dev/null) |
    node -e 'const fs = require("node:fs");
      const { webServer } = JSON.parse(fs.readFileSync(0, "utf8")).config;
      console.log(`${webServer.url} ${webServer.reuseExistingServer}`);'
}

git clone -q --shared "$root" "$tmp/main"
prepare "$tmp/main"
expected_reuse=$([ -n "${CI:-}" ] && echo false || echo true)
got=$(server "$tmp/main")
[ "$got" = "http://localhost:5173 $expected_reuse" ] || fail "main checkout got '$got'"

git -C "$tmp/main" worktree add -q --detach "$tmp/wt"
prepare "$tmp/wt"
got=$(server "$tmp/wt")
[ "$got" = "http://localhost:5174 false" ] || fail "linked worktree got '$got'"

echo "playwright port tests passed"
