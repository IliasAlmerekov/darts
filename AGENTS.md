# Darts App (frontend)

PWA darts game: rooms, SSE lobby player list, player statistics. React 19, TypeScript, Vite,
Nanostores, CSS Modules. The backend is a separate repository, checked out next to this one
in `../dartsapp-backend`.

## Backend contract

`docs/backend-api-contract.json` is the OpenAPI dump of the backend and decides what each
Valibot schema in `src/shared/api/` accepts. Refresh it before you change a schema or a call,
with the stack running, from the workspace folder that holds both repos:

```bash
docker compose exec -T -w /var/www/html php php bin/console nelmio:apidoc:dump > dartsapp/docs/backend-api-contract.json
```

Commit a changed dump on its own, before the code that follows it. When the dump leaves a
question open, the controllers in `../dartsapp-backend/app/src/Controller/` show the real
behaviour.

## Conventions

Before changing code, read every file in `docs/convention/` that the table maps to your
change. The conventions win over current code: fix the code, keep the rule. A domain the
table lacks follows the neighbouring code; ask the user only when the code has no precedent.
Each file ends with a `## Verification` block; run it for every file you touched.

| File              | Read when you...                                                                    |
| ----------------- | ----------------------------------------------------------------------------------- |
| `architecture.md` | add or move files, change imports, touch `App.tsx`, add or change routes            |
| `typescript.md`   | write or change any TS code                                                         |
| `state.md`        | touch `src/shared/store/` or a consumer (`useStore`, `$atom.get()`)                 |
| `api.md`          | add or change API calls, Valibot schemas, mappers, or `src/shared/query/` factories |
| `react.md`        | write or change a component, hook, `useEffect`, or routing helper                   |
| `styling.md`      | write or change CSS, class names, `className`, or style props                       |
| `errors.md`       | throw, catch, log, display, or map errors                                           |
| `testing.md`      | add or change tests, test helpers, mocks, fixtures, or E2E specs                    |

For library APIs (React, React Router, Nanostores, Vitest, Testing Library, Playwright,
Vite), query Context7 before writing code.

## Scope

Solve the whole task with the least new code. Before the first edit, list every place the
change must reach: callers, tests, mocks, fixtures, route mocks for the e2e suite, Valibot
schemas. That list is the scope; features nobody asked for are outside it, named in one
line in the report.

Reach for the first option that works: no code at all, then a component, hook, or helper
already in `src/shared`, then React or browser built-ins, then an installed package, then
one line a reader gets at a glance, then new code.

- Add no abstraction, prop, option, or "for later" code the task does not need. Deletion
  beats addition.
- A bug fix greps every caller of the function it touches and fixes the root cause once,
  in the shared code.
- Moved or merged code keeps its validation and error handling.
- Between options of equal size, take the one correct on edge cases.
- A known shortcut gets a comment: `shortcut: <the limit>, <when to upgrade>`.
- Validation at trust boundaries, error handling that prevents data loss, security, and
  accessibility are never cut.
- Every behaviour change gets a test, however small; only changes that leave behaviour
  untouched (a rename, docs, formatting) go without one.

The final report lists each verification command with its pass or fail status, names every
check you skipped, and ends with what you did not check and the risk left.

## Workflow

Size the task before the first edit. When the size is unclear, treat the task as large.

- **Small**: one change with nothing to decide, such as a typo, a config value, or a bug
  whose cause you already know. Cut the branch, write one failing test at the interface the
  change touches, make the change under `## Scope`, and run the verification.
- **Large**: open design decisions, more than one module, or an area under `## Guardrails`.
  Grill the plan with the user through `/grill-with-docs`; when you start the grill
  yourself, call the `grilling` and `domain-modeling` skills. Once every decision is
  settled, write the plan as numbered subtasks, each with acceptance criteria. Build each
  subtask with the `tdd` skill; its acceptance criteria are the agreed seams. Finish with
  the `code-review` skill against `main`.

`code-review` treats `## Scope` as a repo standard: a smell whose fix adds an abstraction
the task does not need goes in the report as a note, not as a finding.

## Verification

While you work, run only the tests you touch:

```bash
npx vitest run <path>
npx playwright test --project=mocked <spec>
```

Before the commit, `npm run validate:push` runs build, ESLint, Stylelint, prettier, typecheck, knip, secret scan
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
workspace folder that holds both repos. The frontend container serves the main checkout.
In a worktree, `npm run test:e2e` starts its own Vite on :5174 for the run, so it tests the
worktree's code. A manual browser check of a worktree uses `npm run dev -- --port 5174`;
stop that server when the check is done.

`.nvmrc` pins Node.js, and every workflow reads it. A Node.js update changes `.nvmrc` and
the `node:` images in `deploy/frontend.Dockerfile`, `compose.dev.yaml` and
`.gitlab-ci.yml` together. A Node.js major also moves `@types/node` to the same major in
`package.json` and the lockfile, because Dependabot skips `@types/node` majors.

## Branches

Each issue gets its own branch in its own worktree: several sessions share the main checkout,
so its branch stays where it is. Start with `scripts/worktree.sh new <type>/<issue>-<topic>`.
It cuts the branch from the latest `main` into `../worktrees/<repo>-<issue>`, copies the local
`.env` files, runs `npm ci`, and prints the path. Work, test, and commit there. `main` changes
only through a pull request.

Once the PR is open, delete the scratch files the work created (PR and comment body files,
temp scripts, logs) and stop the processes it started. Once it is merged, and at the start of
every new task, run `scripts/worktree.sh prune`. It removes each worktree and local branch whose
PR is merged and lists what it kept.

## Commits and pull requests

Commit messages follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):
`<type>(<scope>): <description>`. The `commit-msg` hook checks them with commitlint, and
`commitlint.config.mjs` lists the allowed types. A breaking change marks the type with `!`
and adds a `BREAKING CHANGE:` footer.

Every PR body is the filled `.github/pull_request_template.md`; its comments say what each
part holds. Pass it with `gh pr create --body-file <file>`. Session notes, verification detail,
follow-ups, and benchmarks go in a comment on the issue. Close the issue once its acceptance
criteria are met and that comment carries the verification.

Every PR adds its change to `CHANGELOG.md` under `## [Unreleased]`, in the group it fits
(Added, Changed, Removed, Fixed), as `Area: change (#N)`.

Commits, PR titles and bodies, and issue comments carry the human author only: no
`Co-Authored-By` trailer, no agent footer, no `triage` skill AI disclaimer.

## Review

Before you review a diff, and after `gh pr create` or a push to an open PR, read
`docs/agents/review.md`. It holds the severities, the checks for every diff, and the
CodeRabbit and Greptile review loops.

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
