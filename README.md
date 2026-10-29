# Dart score app

Dart score app is an app where you can effortlessly keep track of your dart games.

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
```

2. Install Node.js 24.22.1 with npm. `.nvmrc` pins the version; older releases carry the October 2026 Node.js security bugs. Then install the dependencies and the Playwright browser:

```bash
nvm use
npm install
npx playwright install chromium
```

On a fresh Linux machine, run `npx playwright install --with-deps chromium` instead, so Playwright also installs the system libraries Chromium needs.

## Getting Started

```bash
npm run dev
```

To run the frontend together with the backend, start the local Compose stack (project `darts`, from `compose.dev.yaml`) with
`docker compose up -d` in the folder that holds both repositories: the frontend serves :5173, the backend nginx :8001.
See [Verification in `AGENTS.md`](AGENTS.md#verification) for details.

## Environment

Create a `.env` file in the project root using `.env.example` as a template.

## Architecture

The project is pages-based: route-level pages live in `src/pages`, and code that two or more pages share lives in `src/shared`. Imports go one way, `app → pages → shared`. [`docs/convention/architecture.md`](docs/convention/architecture.md) holds the rules, and [ADR 0005](docs/adr/0005-pages-based-structure.md) records why the project uses this structure instead of Feature-Sliced Design or MVC.

## Further reading

- [`docs/convention/`](docs/convention/) — coding conventions per area (architecture, TypeScript, state, API, React, styling, errors, testing)
- [`docs/adr/`](docs/adr/) — architecture decision records and the reasons behind them
- [`docs/test-plans/`](docs/test-plans/) — Markdown test plans the Playwright specs trace to
- [`GLOSSARY.md`](GLOSSARY.md) — domain terms (lobby, tablet game, current game, …) and the words to avoid
- [`SECURITY.md`](SECURITY.md) — how to report a vulnerability and the security rules for changes
- [`AGENTS.md`](AGENTS.md) — workflow, backend contract, verification and review rules

## Scripts

| Command                 | Description                               |
| ----------------------- | ----------------------------------------- |
| `npm run dev`           | Start dev server                          |
| `npm run build`         | Type-check and build for production       |
| `npm run preview`       | Preview production build locally          |
| `npm run typecheck`     | Run TypeScript type-checking              |
| `npm run eslint`        | Lint JS/TS sources                        |
| `npm run stylelint`     | Lint CSS modules                          |
| `npm run test`          | Run unit/integration tests (Vitest)       |
| `npm run coverage`      | Run tests with coverage report            |
| `npm run test:e2e`      | Run mocked end-to-end tests (Playwright)  |
| `npm run test:e2e:live` | Run live end-to-end tests (needs backend) |
| `npm run secrets:check` | Scan for accidentally committed secrets   |
| `npm run knip`          | Find unused exports and dead code         |

## Tech stack

- **React 19** — functional components only
- **TypeScript** — strict mode
- **Vite** — build tooling
- **React Router 7** — client-side routing with lazy-loaded routes
- **Nanostores** — lightweight state management
- **CSS Modules** — scoped styles
- **@dnd-kit** — drag and drop
- **Vitest** — unit and integration tests
- **Playwright** — end-to-end tests

## Commit conventions

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):

| Type       | When to use                          |
| ---------- | ------------------------------------ |
| `feat`     | New feature                          |
| `fix`      | Bug fix                              |
| `refactor` | Code change with no behaviour change |
| `test`     | Adding or updating tests             |
| `docs`     | Documentation only                   |
| `style`    | Formatting, no logic change          |
| `chore`    | Config, build tooling, deps          |
