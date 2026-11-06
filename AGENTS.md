# Darts App (frontend)

PWA darts game: rooms, SSE lobby player list, player statistics. React 19, TypeScript, Vite,
Nanostores, CSS Modules. For sibling repositories and worktree path resolution, read
`docs/agents/workspace.md` before cross-repository work.

## Backend contract

`docs/backend-api-contract.json` is the OpenAPI dump of the backend and decides what each
Valibot schema in `src/shared/api/` accepts. Before changing a schema or call, refresh
the dump with the running stack using `docs/agents/workspace.md`; it targets this checkout.
Commit a changed dump on its own, before the code that follows it. When the dump leaves a
question open, inspect the backend controllers using the sibling path resolved there.

## Conventions

Before changing code, read every file in `docs/convention/` that the table maps to your
change. The conventions win over current code: fix the code, keep the rule. A domain the
table lacks follows the neighbouring code; ask the user only when the code has no precedent.
Collect the relevant `## Verification` checks and run their union once.

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

Use Context7 when a library API is uncertain or version-sensitive; check installed versions first.

## Scope

Trace affected callers, contracts, fixtures, and tests before editing. Reuse existing code
where it fits; add only what the task needs. Preserve validation, error handling,
security, and accessibility when moving or simplifying code. Fix shared causes and
cover changed behaviour at the relevant interface.

## Workflow

Read the issue and Agent Brief first. Resolve open design decisions before implementation;
use clarification or design skills when those decisions need the user's judgment.
Implement settled work directly, with targeted regression tests for behaviour fixes.
Docs, formatting, and config-only changes need checks appropriate to their effects.
Report executed checks, gaps, and remaining risks concisely; distinguish remote CI state.

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

For local Compose startup, worktree browser checks, or stale Vite imports, read
`docs/agents/runtime.md`.

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

## Review

Before you review a diff, and after `gh pr create` or a push to an open PR, read
`docs/agents/review.md`. It holds severity and review checks. For publishing and bot follow-up, also read
`docs/agents/publishing.md`.

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
