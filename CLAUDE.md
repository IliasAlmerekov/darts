# Darts App — Project Context

## Project

PWA darts game: room creation, SSE real-time throw streaming, player statistics.

## Tech Stack

- **Runtime/UI**: React 18 (functional components only — no class components)
- **Language**: TypeScript 5.8 (strict mode — `any` is STRICTLY FORBIDDEN)
- **Build**: Vite 7
- **Routing**: React Router 6
- **Global state**: Nanostores (`$` prefix for store instances: `$gameStore`)
- **Styling**: CSS Modules (co-located with component — no global CSS except app-level entry)
- **Testing**: Vitest + Testing Library (unit/integration), Playwright (E2E)

## Project Structure

```
src/
  app/      # bootstrap, providers, router, global guards, error boundaries
  pages/    # route-level components (thin orchestration layer only)
  shared/   # api client, utilities, hooks, types, shared UI kit
```

This is a _pages-based_ layout rather than a full Feature‑Sliced Design; the
authoritative folders are `app`, `pages` and `shared`. Other directories may
exist (e.g. `stores`, `utils` inside `shared`), but routes and features are
derived from `pages`.

### Dependency Rule (strict)

`app → pages → shared`

- Reverse imports: **FORBIDDEN**
- Cross-imports between sibling pages: **FORBIDDEN** (only via `index.ts` public API)
- Deep imports into another slice's internals: **FORBIDDEN**

## Critical Conventions

### TypeScript

- `any` — FORBIDDEN without explicit approval and documentation
- `as` type casts — FORBIDDEN without a preceding type guard; use type narrowing instead
- Exported functions/components — explicit return types required
- Null/undefined — handle explicitly; no implicit fallbacks
- Non-null assertion `!` — FORBIDDEN; use explicit null checks

### Logging

- `console.log` / `console.error` / `console.warn` / `console.info` — **FORBIDDEN** in application code
- **ALWAYS** use `clientLogger` from `src/shared/lib/clientLogger.ts`
- API: `clientLogger.warn(event, { context?, error? })` and `clientLogger.error(event, { context?, error? })`
- `event` is a short snake_case string describing what happened (e.g. `"sse_connection_failed"`)
- Sensitive fields (tokens, passwords, etc.) are auto-redacted by the logger — never pre-redact manually

### Naming

- Components: `PascalCase` (`GameBoard.tsx`)
- Hooks: `camelCase` with `use` prefix (`useGameState.ts`)
- Stores: `$` prefix (`$gameStore`)
- Utility functions: verb-first (`mapPlayerDto`)
- API DTO types: `Dto` suffix (`PlayerDto`)
- Constants: `UPPER_SNAKE_CASE`

### Data Mapping

- Raw DTOs passed directly to UI: **FORBIDDEN**
- Mapping happens at the API boundary (`shared/api/`)
- Mapper functions must be pure and unit-tested

### Error Handling

- Silent catch blocks: **FORBIDDEN**
- Every `catch` must: remap to a typed error OR return a typed failure result OR convert to user-safe message + structured log
- User-facing errors: safe, actionable, no internal details leaked

### State

- Nanostores — only for cross-page or truly shared state
- Transient UI state — local to component/page
- Direct store mutations: **FORBIDDEN** — use explicit actions only

### React

- Functional components only
- Effects MUST clean up subscriptions/listeners/timers
- Network requests MUST support cancellation (AbortController)

### Testing

- Test files are **co-located** with source files (`.test.ts` / `.test.tsx`) — no `__tests__` folders
- Always declare vitest environment at the top of the file: `// @vitest-environment jsdom` (DOM) or `// @vitest-environment node` (pure logic)
- Structure: `describe("<unit-name>") → it("should <behavior>")` — use `it()`, never `test()`
- `vi.mock()` calls go before imports (hoisting requirement)
- Use factory builder functions for test data: `buildPlayer()`, `buildGameThrowsResponse()` — never raw object literals inline
- `beforeEach` for mock resets; `afterEach` only when cleanup is mandatory
- Async: use `waitFor()` and `act()` from Testing Library; avoid arbitrary `setTimeout` delays
- Test names: `"should <expected behavior> when <condition>"`

### Imports

Path aliases (configured in `vite.config.ts` and `tsconfig.json`):

| Alias       | Resolves to                 |
| ----------- | --------------------------- |
| `@/app/`    | `src/app/`                  |
| `@/pages/`  | `src/pages/`                |
| `@/shared/` | `src/shared/`               |
| `@/lib/`    | `src/shared/lib/`           |
| `@/types`   | `src/shared/types/index.ts` |
| `@/types/*` | `src/shared/types/*`        |
| `@/*`       | `src/*`                     |

- Prefer the most specific alias: `@/lib/clientLogger` over `@/shared/lib/clientLogger`
- Shared types: import from `@/types` (barrel) — never from deep internal paths
- Cross-page imports: **FORBIDDEN** (enforced by ESLint `no-restricted-imports`)

### Components

- Every component has a co-located CSS Module (`ComponentName.module.css`)
- CSS class names: `camelCase` (e.g. `.btnPrimary`, `.gamePageHeader`) — no BEM, no kebab-case
- Conditional classes: use `clsx()` — never string concatenation
- `index.ts` barrel files: **only** for `src/shared/ui/<name>/` (UI kit) — pages and page sub-components do NOT have barrels
- Component props: defined as `interface` inline in the same file — no separate `.types.ts` files for props

### Types

- Shared domain types live in `src/shared/types/`: `game.ts`, `api.ts`, `player.ts`; re-exported via `index.ts`
- API response/request types: `src/shared/types/api.ts`
- Interface naming: `PascalCase` — **no** `I` prefix (e.g. `GameState`, not `IGameState`)
- `interface` for object shapes, `type` for unions/intersections/aliases

### API Client

- Use `apiClient<T>(endpoint, config)` from `src/shared/api/client.ts`
- Every call **must** provide a `validate` type guard: `validate: isGameThrowsResponse`
- Error types: `ApiError`, `NetworkError`, `UnauthorizedError`, `TimeoutError`, `ApiValidationError` — import from `@/shared/api`
- Default timeout: 30 s (built into client) — do not add manual timeouts on top

### Hooks

- Page-level hooks: co-located inside the page folder (`src/pages/<Page>/use*.ts`)
- Shared reusable hooks: `src/shared/hooks/`
- Page hooks orchestrate local state + shared hooks + API calls; shared hooks isolate cross-cutting concerns (auth, SSE, subscriptions)

## Git Conventions

- Commit messages: Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`)
- **NEVER add `Co-Authored-By:` or any co-authorship trailer to commit messages**

## Verification Commands

The repository-level validation suite is enforced by the `pre-push` hook. Agents should keep changes compatible with these commands, but should not automatically run the full suite after every edit unless the user explicitly asks or troubleshooting requires it.

```bash
npm run build
npm run eslint
npm run stylelint
npm run prettier:check
npm run test
npm run typecheck
npm run secrets:check
npm run test:e2e
```

## Development Workflow — 4 Phases

**REQUIRED** for any non-trivial change (new feature, refactor, complex bug fix):

| Phase        | Command                       | Agent                                        | Artifact                                                             |
| ------------ | ----------------------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| 1. Research  | `/research_codebase <ticket>` | `research-lead` + `research-sub`             | `docs/<feature>/research/research.md`                                |
| 2. Design    | `/design_feature`             | `architect`                                  | `docs/<feature>/design/design-summary.md`                            |
| 3. Plan      | `/plan_feature`               | `planner`                                    | `docs/<feature>/plan/implementation-plan.md`                         |
| 4. Implement | `/implement_feature <N>`      | `coder` → `reviewer` → `security` → `tester` | production code + `docs/<feature>/implementation/phase-0N-report.md` |

**NEVER** skip or merge phases without explicit user approval.

### Feature Folder Convention

Each feature gets its own folder created automatically at Phase 1 with subfolders per phase:

```
docs/
  add-player-statistics/    # example feature folder
    research/               # Phase 1 artifacts
      research.md
    design/                 # Phase 2 artifacts
      design-summary.md
      api-contracts.md
      component-architecture.md
      data-flow.md
      sequence.md
      state-design.md
      test-strategy.md
      adr-001-*.md
    plan/                   # Phase 3 artifacts
      implementation-plan.md
      phase-01.md
      phase-02.md
      verification-matrix.md
    implementation/         # Phase 4 artifacts
      progress-log.md
      phase-01-report.md
      phase-02-report.md
```

## Testing Policy

- Every behavioral change requires a test
- Unit: pure functions, mappers, hooks
- Integration: React components, route-level with mocked boundaries
- E2E (Playwright): critical user journeys (auth, game flow, join/start/finish)
- Mocking: only external boundaries (API layer, browser APIs, time) — NEVER mock internal business logic under test
- Test names: `should <expected behavior> when <condition>`
