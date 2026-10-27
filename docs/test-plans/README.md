# Test plans

A test plan is a Markdown list of the scenarios a feature must survive: the steps a user
takes and the result they expect. Plans are the source; the Playwright specs in `tests/` are
the executable checks generated from them or traced to them.

- `login-test-plan.md`: login form, validation, errors, and the link to registration.
- `joined-game-test-plan.md`: the player view of a joined game.
- `ticket-test-plan.md`: the throw feature on `/game/:id`: scoring, turns, bust, checkout, and undo.

The first line of a spec names its plan, for example
`// spec: docs/test-plans/login-test-plan.md`. A spec that covers a new scenario adds it to
its plan, and a new plan lives in this folder. Plans are documentation only: Vitest and
Playwright never run anything here. How the suites run is in `tests/README.md`.
