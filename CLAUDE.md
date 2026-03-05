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

### Dependency Rule (strict)
`app → pages → shared`

- Reverse imports: **FORBIDDEN**
- Cross-imports between sibling slices: **FORBIDDEN** (only via `index.ts` public API)
- Deep imports into another slice's internals: **FORBIDDEN**

## Critical Conventions

### TypeScript
- `any` — FORBIDDEN without explicit approval and documentation
- Exported functions/components — explicit return types required
- Null/undefined — handle explicitly; no implicit fallbacks

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

## Git Conventions
- Commit messages: Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`)
- **NEVER add `Co-Authored-By:` or any co-authorship trailer to commit messages**

## Verification Commands
```bash
npm run eslint
npm run stylelint
npm run test
npm run typecheck
npm run test:e2e   # required for critical flows and final phase
npx prettier --check .
```

## Development Workflow — 4 Phases
**REQUIRED** for any non-trivial change (new feature, refactor, complex bug fix):

| Phase | Command | Agent | Artifact |
|-------|---------|-------|----------|
| 1. Research | `/research_codebase <ticket>` | `research-lead` + `research-sub` | `docs/<feature>/research.md` |
| 2. Design | `/design_feature` | `architect` | `docs/<feature>/design-summary.md` |
| 3. Plan | `/plan_feature` | `planner` | `docs/<feature>/implementation-plan.md` |
| 4. Implement | `/implement_feature <N>` | `coder` → `reviewer` → `security` → `tester` | production code + `docs/<feature>/phase-0N-report.md` |

**NEVER** skip or merge phases without explicit user approval.

### Feature Folder Convention
Each feature gets its own folder created automatically at Phase 1:
```
docs/
  .current-feature          # slug of the active feature (read by phases 2-4)
  add-player-statistics/    # example feature folder
    research.md             # Phase 1
    design-summary.md       # Phase 2
    api-contracts.md        # Phase 2
    implementation-plan.md  # Phase 3
    phase-01.md             # Phase 3
    phase-02.md             # Phase 3
    verification-matrix.md  # Phase 3
    progress-log.md         # Phase 4 (appended per phase)
    phase-01-report.md      # Phase 4
```

## Testing Policy
- Every behavioral change requires a test
- Unit: pure functions, mappers, hooks
- Integration: React components, route-level with mocked boundaries
- E2E (Playwright): critical user journeys (auth, game flow, join/start/finish)
- Mocking: only external boundaries (API layer, browser APIs, time) — NEVER mock internal business logic under test
- Test names: `should <expected behavior> when <condition>`
