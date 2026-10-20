# Darts App (frontend)

PWA darts game: rooms, SSE lobby player list, player statistics. React 18, TypeScript, Vite,
Nanostores, CSS Modules. Backend lives in a separate repository; its API contract is
`docs/backend-api-contract.json`.

## Before changing code

Read `docs/convention/coding-standards.md`, then every domain file its table maps to your
change. The conventions win over current code: fix the code, keep the rule. A domain the
table lacks is undocumented, so ask the user before deciding it.

For navigation, start at `docs/repo-map.md`.

For library APIs (React, React Router, Nanostores, Vitest, Testing Library, Playwright,
Vite), query Context7 before writing code.

## Tickets

When a ticket names its source-of-truth files, read only those. When it asks for a
literal-value inventory, take every member from the named source; a member the source
lacks stays missing.

## Verification

`npm run validate:push` runs build, ESLint, Stylelint, prettier, typecheck, knip, secret scan
and unit tests; the `pre-push` hook runs the same script. Run `npm run test:e2e` as well when
the change touches browser flows, routing, auth, responsive layout, or a Playwright-covered journey.
That is the mocked suite: every `/api` request needs a route mock. `npm run test:e2e:live` runs
`tests/live/` against a real backend and needs `PLAYWRIGHT_TEST_*` and a reachable `VITE_API_TARGET`.

When most mocked specs fail on the login page, read `test-results/*/error-context.md`. A Vite
import error there means the dev server on :5173 runs stale `node_modules`; Playwright reuses
it. Run `docker compose -f compose.dev.yaml restart frontend`.

Locally the app runs as one Compose stack, the project `darts`: frontend on :5173, backend
nginx on :8001, php and mysql. Both repos' compose files carry `name: darts`, so any
`docker compose` command joins that stack; start it with `docker compose up -d` in the
workspace folder that holds both repos. The frontend container serves the main checkout, so
browser checks and `npm run test:e2e` see the main checkout's code. To show or test a branch
in the browser, check that branch out in the main checkout. A worktree is for unit tests,
lint and typecheck, and reuses the running stack for everything else.

A fresh clone has no `node_modules`: run `npm install` first, or the hook fails.

## Branches

Each issue gets its own branch, cut from the latest `main`. Before the first edit, run
`git switch main && git pull --ff-only`, then `git switch -c <type>/<issue>-<topic>`.
`main` changes only through a pull request.

Once the PR is open, clean up after the work and keep only the branch: remove the issue's
worktree (`git worktree remove <path>`, then `git worktree prune`), delete the scratch files
the work created (PR and comment body files, temp scripts, logs), and stop the processes it
started.

## Commits and pull requests

Commit messages follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):
`<type>(<scope>): <description>`. The `commit-msg` hook checks them with commitlint, and
`commitlint.config.mjs` lists the allowed types. A breaking change marks the type with `!`
and adds a `BREAKING CHANGE:` footer.

Every PR body is the filled `.github/pull_request_template.md`, whoever opens the PR:

1. Copy the template to a file, fill it in, and pass it with `gh pr create --body-file <file>`.
2. Keep four parts, in this order:
   - `Closes #N`. Write `No issue: <reason>` instead only when `CONTRIBUTING.md` allows a PR without an issue.
   - What changed and why, in 1 or 2 sentences.
   - `Evidence:` bullets, each a command and its result, or a test that failed before the fix and passes after.
     `npm run test:red-on-base` lists the changed tests that fail on `origin/main`'s code.
   - `Confidence:` high, medium, or low, plus one sentence on the risk left.
3. Delete the template's `<!-- -->` comments. The body has at most 10 non-empty lines.

The diff already shows files and changes, so the body carries only the four parts. Session
notes, verification detail, follow-ups, and benchmarks go in a comment on the issue. Close the
issue once its acceptance criteria are met and that comment carries the verification.

Every PR adds its change to `CHANGELOG.md` under `## [Unreleased]`, in the group it fits
(Added, Changed, Removed, Fixed), as `Area: change (#N)`.

Commits, PR titles and bodies, and issue comments carry the human author only: no
`Co-Authored-By` trailer and no Claude or agent footer.

## Guardrails

Ask the user first before you:

- add, remove, or upgrade a dependency;
- touch auth, input or request validation, CSRF, roles, tokens, or credentials. Response
  schemas in `src/shared/api/` are not on this list: the contract decides them;
- run a destructive command.

Keep `.env` values out of prompts, logs, commits, and issues.

## Agent skills

### Issue tracker

GitHub Issues in IliasAlmerekov/darts, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default roles, each label named after its role. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
