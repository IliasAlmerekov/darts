# Dart score app

Dart score app is an app where you can effortlessly keep track of your dart games.

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
```

2. Install dependencies:

```bash
npm install
```

## Getting Started

```bash
npm run dev
```

## Environment

Create a `.env` file in the project root using `.env.example` as a template.

## Architecture

This project uses a **pages-based architecture**. Route-level pages are grouped in `src/pages`, while cross-cutting logic and reusable UI live in `src/shared`.

### Top-level layout

```
src/
├── app/          # Application bootstrap, routing, global styles, ErrorBoundary
├── assets/       # Static assets: fonts, icons
├── pages/        # Route-level pages (screen modules)
└── shared/       # Shared utilities, UI components, types, API client
```

### Page structure

Each page module is colocated in its own folder and typically follows this shape:

```
pages/<PageName>/
├── index.tsx       # Route entry/page composition
├── components/     # Page-local UI blocks
├── lib/            # Pure helpers/business rules (optional)
├── *.module.css    # Page styles (CSS Modules)
└── *.test.ts(x)    # Unit/integration tests near implementation
```

Not every page needs all folders; keep only what is required.

### Pages

| Page                | Responsibility                                |
| ------------------- | --------------------------------------------- |
| `LoginPage`         | Login flow                                    |
| `RegisterPage`      | Registration flow                             |
| `StartPage`         | Pre-game lobby, player preparation            |
| `GamePage`          | Active game scoring flow                      |
| `GameSummaryPage`   | Post-game summary                             |
| `StatisticsPage`    | Statistics screens (`GamesOverview`, details) |
| `SettingsPage`      | Game/application settings                     |
| `JoinedGamePage`    | Player view for joined games                  |
| `PlayerProfilePage` | Player profile                                |

### Shared

```
shared/
├── api/            # API modules grouped by domain
├── hooks/          # Reusable hooks
├── lib/
│   ├── api/        # Base HTTP client, error types
│   ├── soundPlayer.ts
│   ├── parseThrowValue.ts
│   ├── player-mappers.ts
│   └── ...
├── store/          # Global Nanostores
├── types/          # Shared TypeScript types and ambient declarations
└── ui/             # Reusable UI components (Button, Overlay, Pagination, etc.)
```

### Rules

- Shared logic lives in `shared/`, not copied between pages.
- `shared/` must not import from upper layers (`pages` or `app`).
- Keep route-level pages thin: read params, connect hooks/api, render UI.
- Reuse shared UI and utilities before introducing new global modules.

## Scripts

| Command                      | Description                               |
| ---------------------------- | ----------------------------------------- |
| `npm run dev`                | Start dev server                          |
| `npm run build`              | Type-check and build for production       |
| `npm run typecheck`          | Run TypeScript type-checking              |
| `npm run eslint`             | Lint JS/TS sources                        |
| `npm run stylelint`          | Lint CSS modules                          |
| `npm run test`               | Run unit/integration tests (Vitest)       |
| `npm run test:e2e`           | Run end-to-end tests (Playwright)         |
| `npm run architecture:check` | Check import rules via dependency-cruiser |
| `npm run knip`               | Find unused exports and dead code         |

## Tech stack

- **React 18** — functional components only
- **TypeScript** — strict mode
- **Vite** — build tooling
- **React Router 6** — client-side routing with lazy-loaded routes
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
