# Review

Rules for reviewing a diff in this repo and for the CodeRabbit and Greptile loops on a pull
request. `.coderabbit.yaml` and `.greptile/` point both bots at the guidelines below.

## Guidelines

Review like the senior engineer who owns this app and gets paged when a game night breaks.
Read the linked issue, every ADR the diff touches, and each `docs/convention/` file the
table in `AGENTS.md` `## Conventions` maps to the diff, then hold the change to them: a broken rule from
those files, or from `## Backend contract` or `## Scope` in `AGENTS.md`, is a finding. Security review follows
`SECURITY.md`.

A finding has five parts:

- **Severity**: P0, P1, or P2, from the list below.
- **Location**: the file and line.
- **Evidence**: the input or state that triggers the defect in the current code.
- **Impact**: the wrong result the player or the tablet sees.
- **Fix**: the smallest change inside `AGENTS.md` `## Scope`.

A suspicion without that failure path is one `Question:` line in the summary, never an
inline comment. Report only what ESLint, Stylelint, TypeScript, knip, and the tests
cannot catch; a short list of real defects is the goal.

- **P0**: a lost or corrupted throw or game result, an access bypass, a leaked secret, or a
  crash that blocks a running game.
- **P1**: a wrong screen or score a user can reach, a contract break with the backend, a
  lost accessibility path with substantial user impact.
- **P2**: a needless re-render or request, dead code left behind, a fix in one caller while
  the defect sits in shared code.

Apply checks relevant to the changed behaviour. Severity follows actual impact, not the
category alone. Missing regression coverage is a validation gap unless a failure path is shown.

Check relevant parts of the diff:

- **Contract.** A Valibot schema in `src/shared/api/` matches
  `docs/backend-api-contract.json` at the same commit. A schema widened to `v.any()`,
  `v.unknown()`, or an optional field the contract requires, so that a response passes, is
  a finding whose severity follows demonstrated impact.
- **Async lifecycle.** An effect that subscribes, starts a timer, opens an `EventSource`, or
  sends a request cleans up on unmount and on dependency change. A request passes its
  `signal`. A late response for a previous game or player never overwrites the current one.
- **Tests prove the change.** A regression test for a behaviour fix fails on the base code
  (`npm run test:red-on-base`); record when that check is unavailable. A component or Playwright test asserts what the user sees
  through queries by role and name. A logic, API, store, or non-DOM hook test asserts
  return values or the contract, as `docs/convention/testing.md` prescribes. A new `/api`
  call has a route mock in the mocked e2e suite. A test that only replays its own mocks
  proves nothing.
- **Error paths.** Every failure reaches the user as a message or a recovery path, or goes
  to `clientLogger`. A `catch` that drops the error is a finding whose severity follows demonstrated impact.
- **Gates.** Inspect new suppressions, casts, baseline changes, and loosened check configs.
  Require a specific rationale and evidence that safety still holds. Report defects by
  actual impact; syntax alone does not establish P1 severity.

For PR publishing and review bot follow-up, read [publishing.md](publishing.md).
