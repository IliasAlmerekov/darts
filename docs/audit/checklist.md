# Darts App — Audit Checklist

Exhaustive quality checklist for the project. Each item is binary: ✅ pass / ❌ violation found / ⚠️ requires manual review.

Sources: `CLAUDE.md`, `eslint.config.mjs`, `tsconfig.json`, project conventions.

---

## Audit Status

| Date | Reviewer | Result |
| ---- | -------- | ------ |
| —    | —        | —      |

---

## 1. Architecture — Pages-Based Structure

### 1.1 Folder Structure

| #     | Criterion                                                                        | How to verify                        | Severity |
| ----- | -------------------------------------------------------------------------------- | ------------------------------------ | -------- |
| 1.1.1 | Only allowed root folders exist: `app/`, `pages/`, `shared/`, `assets/`, `test/` | `ls src/` — no unexpected folders    | CRITICAL |
| 1.1.2 | No `features/` folder                                                            | `ls src/features` — must not exist   | CRITICAL |
| 1.1.3 | No `components/` folder at `src/` level                                          | `ls src/components` — must not exist | CRITICAL |
| 1.1.4 | No `utils/` folder at `src/` level                                               | `ls src/utils` — must not exist      | CRITICAL |
| 1.1.5 | `app/` contains only bootstrap: router, providers, guards, error boundaries      | manual review of `src/app/`          | MAJOR    |
| 1.1.6 | `pages/` contains only thin orchestration (no business logic inlined in JSX)     | manual review                        | MAJOR    |
| 1.1.7 | `shared/` contains only reusable modules with no page-specific coupling          | manual review                        | MAJOR    |

### 1.2 Dependency Rule `app → pages → shared`

| #     | Criterion                                                                                         | How to verify                                                           | Severity |
| ----- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------- |
| 1.2.1 | `shared` does not import from `pages`                                                             | `grep -r "from '@/pages" src/shared/` — empty                           | CRITICAL |
| 1.2.2 | `shared` does not import from `app`                                                               | `grep -r "from '@/app" src/shared/` — empty                             | CRITICAL |
| 1.2.3 | `pages` does not import from sibling pages                                                        | `npm run eslint` (no-restricted-imports rule)                           | CRITICAL |
| 1.2.4 | `pages` does not import from `app`                                                                | `grep -r "from '@/app" src/pages/` — empty                              | CRITICAL |
| 1.2.5 | No deep imports into another slice's internals — always import from the slice's public `index.ts` | `grep -r "from '@/shared/api/client'" src/pages/` — no direct internals | MAJOR    |

### 1.3 Module Boundaries

| #     | Criterion                                                                                                        | How to verify                                                                                 | Severity |
| ----- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------- |
| 1.3.1 | No prefetch or data fetching for routes the current user role cannot access                                      | manual review of route data fetching logic                                                    | MAJOR    |
| 1.3.2 | Route data fetching does not fire unconditionally for unauthenticated users                                      | manual review of loaders and `useEffect` fetches inside protected routes                      | CRITICAL |
| 1.3.3 | No direct import of another slice's CSS module — expose styles via barrel export only                            | `grep -rn "\.module\.css" src/pages/ src/shared/` — manual review for cross-slice CSS imports | MAJOR    |
| 1.3.4 | `testOnly*` exports must not appear in the production barrel (`index.ts`) — use a separate test-only entry point | manual review of `src/shared/ui/*/index.ts` for `testOnly` exports                            | MAJOR    |

### 1.4 Page Structure

| #     | Criterion                                              | How to verify                             | Severity |
| ----- | ------------------------------------------------------ | ----------------------------------------- | -------- |
| 1.4.1 | Each page is a separate folder in `src/pages/`         | `ls src/pages/`                           | MAJOR    |
| 1.4.2 | Pages do not have `index.ts` barrel files              | `find src/pages -name "index.ts"` — empty | MAJOR    |
| 1.4.3 | Page-level hooks are co-located inside the page folder | `ls src/pages/*/use*.ts`                  | MAJOR    |
| 1.4.4 | Reusable hooks live in `src/shared/hooks/`             | `ls src/shared/hooks/`                    | MINOR    |

### 1.5 Routing

| #     | Criterion                                                                                          | How to verify                                               | Severity |
| ----- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------- |
| 1.5.1 | Per-route `<Suspense>` boundaries — no single `<Suspense>` wrapping all lazy routes                | manual review of `App.tsx` / router definition              | MAJOR    |
| 1.5.2 | Per-route `errorElement` — no single `ErrorBoundary` placed outside `<BrowserRouter>`              | manual review of route definitions                          | MAJOR    |
| 1.5.3 | Optional route params (`/:id?`) used instead of duplicate `<Route>` declarations for the same page | `grep -rn "<Route" src/app/` — manual review for duplicates | MAJOR    |
| 1.5.4 | Route data fetching uses React Router 6 loaders — not `useEffect` after mount                      | manual review of data-loading patterns in pages             | MAJOR    |

---

## 2. Reliability

| #   | Criterion                                                                                                                                 | How to verify                                                                                        | Severity |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------- |
| 2.1 | Global singleton handlers (e.g. `setUnauthorizedHandler`) are guarded against concurrent duplicate calls                                  | `grep -rn "setUnauthorizedHandler\|setSingletonHandler" src/` — manual review for guard logic        | MAJOR    |
| 2.2 | Refs updated via `useEffect` are not read synchronously in the same render cycle — update refs synchronously or derive the value directly | manual review of `useRef` + `useEffect` pairs                                                        | MAJOR    |
| 2.3 | Dead code paths are removed — unreachable `catch` blocks, aliases with no logic                                                           | manual review + `npx knip`                                                                           | MAJOR    |
| 2.4 | All code paths in async functions have explicit handling — no silent implicit `undefined` return                                          | manual review of async functions                                                                     | MAJOR    |
| 2.5 | Nanostore values read reactively via `useStore()` — never via `.get()` inside `useMemo`                                                   | `grep -rn "\.get()" src/pages/ src/app/` — manual review for useMemo context                         | CRITICAL |
| 2.6 | Hardcoded domain values read from store or props — no magic numbers/strings in JSX                                                        | manual review of JSX for inline constants                                                            | MAJOR    |
| 2.7 | Nanostore values inside `useEffect` must be read via reactive subscription (`useStore` / `subscribe`) — not via `.get()` snapshot         | `grep -rn "\.get()" src/ --include="*.ts" --include="*.tsx"` — check for `.get()` inside `useEffect` | CRITICAL |
| 2.8 | Navigation side effects guarded against repeat calls — no unguarded `navigate()` on repeated state updates without a condition check      | manual review of `navigate()` calls inside reactive subscriptions or `useEffect`                     | MAJOR    |
| 2.9 | Duplicate SSE connections to the same stream are forbidden — use the shared `useRoomStream` hook                                          | `grep -rn "new EventSource\|createSSEConnection" src/pages/` — must be empty                         | CRITICAL |

---

## 3. Code Quality

| #    | Criterion                                                                                                                                                                                              | How to verify                                                                                                                                                           | Severity |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 3.1  | No test-runtime detection in production code (e.g. `navigator.userAgent.includes("jsdom")`) — mock in test setup instead                                                                               | `grep -rn "jsdom\|__TEST__\|process\.env\.NODE_ENV.*test" src/ --include="*.ts" --include="*.tsx"`                                                                      | CRITICAL |
| 3.2  | No no-op aliases (`const x = y` with no additional logic) — use the original variable directly                                                                                                         | manual review                                                                                                                                                           | MINOR    |
| 3.3  | Numeric inputs from `string \| number` arguments validated before use — `Number(id)` producing `NaN` must be guarded; numeric route params validated with `> 0` (`Number.isFinite` accepts 0 as valid) | `grep -rn "Number(" src/ --include="*.ts" --include="*.tsx"` — manual review for NaN guard                                                                              | MAJOR    |
| 3.4  | No dead props in component interfaces — remove props that are never read in the component body                                                                                                         | manual review of component prop interfaces vs usage in JSX                                                                                                              | MAJOR    |
| 3.5  | No dead return values from hooks — remove fields from hook return objects that are never used by any consumer                                                                                          | manual review of hook return values vs callers                                                                                                                          | MAJOR    |
| 3.6  | No trivial type export aliases (`export type UserRole = Role`) — use the original type directly                                                                                                        | `grep -rn "^export type .* = [A-Z]" src/ --include="*.ts"` — manual review for no-logic aliases                                                                         | MINOR    |
| 3.7  | Truthy checks on `number` types are forbidden — use `!== undefined` or `!== null` explicitly (0 is a valid number)                                                                                     | `grep -rn "if (.*[Cc]ount\|if (.*[Ll]ength\|if (.*[Ii]ndex\|if (.*[Ss]core" src/ --include="*.ts" --include="*.tsx"` — manual review for implicit truthiness on numbers | MAJOR    |
| 3.8  | Environment-capability checks (e.g. `canUseSessionStorage`) must catch the specific failure mode (`SecurityError`) — `typeof x !== "undefined"` does not guard against permission errors               | manual review of browser API availability checks                                                                                                                        | MAJOR    |
| 3.9  | Magic number fallbacks must use named constants — no silent `?? 301` or `?? 0`; missing source data must surface an error or loading state rather than silently defaulting                             | manual review of `??` and `\|\|` fallbacks on domain values                                                                                                             | MAJOR    |
| 3.10 | Redundant `return;` at the end of a `void` function's `catch` block must be removed                                                                                                                    | manual review of `catch` blocks in `void` functions                                                                                                                     | MINOR    |

---

## 4. TypeScript — Type Safety

### 4.1 Forbidden Constructs

| #      | Criterion                                                                                            | How to verify                                                                     | Severity |
| ------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------- |
| 4.1.1  | No `any` types                                                                                       | `npm run eslint` + `grep -rn ": any" src/`                                        | CRITICAL |
| 4.1.2  | No `as` casts without a preceding type guard that proves the full shape (not a partial object check) | `grep -rn " as " src/ --include="*.ts" --include="*.tsx"` — manual review each    | CRITICAL |
| 4.1.3  | No chained `as` casts (e.g. `as X as Y`)                                                             | `grep -rn " as .* as " src/` — empty                                              | CRITICAL |
| 4.1.4  | No `as T` on `unknown` — use a runtime type guard function instead                                   | manual review of all `as` usages on `unknown` values                              | CRITICAL |
| 4.1.5  | `location.state` validated with a runtime type guard — no direct `as` cast                           | `grep -rn "location\.state as" src/` — empty                                      | CRITICAL |
| 4.1.6  | No `!` non-null assertion                                                                            | `grep -rn "!\." src/ --include="*.ts" --include="*.tsx"` — empty                  | CRITICAL |
| 4.1.7  | No `@ts-ignore`                                                                                      | `grep -rn "@ts-ignore" src/` — empty                                              | CRITICAL |
| 4.1.8  | No `@ts-nocheck`                                                                                     | `grep -rn "@ts-nocheck" src/` — empty                                             | CRITICAL |
| 4.1.9  | `BodyInit` casts carry inline comment `// safe: BodyInit accepts any serializable value`             | `grep -n "as BodyInit" src/`                                                      | MAJOR    |
| 4.1.10 | `parseInt` must always have explicit radix 10 as second argument                                     | `grep -rn "parseInt(" src/ --include="*.ts" --include="*.tsx"` — check all usages | MAJOR    |

### 4.2 Required Annotations

| #     | Criterion                                                                                                                       | How to verify                          | Severity |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | -------- |
| 4.2.1 | All exported functions have explicit return types                                                                               | `npm run typecheck`                    | MAJOR    |
| 4.2.2 | All exported components have explicit return types (`React.JSX.Element` or `ReactNode`) — no bare `JSX.Element` in return types | `npm run typecheck`                    | MAJOR    |
| 4.2.3 | All non-trivial inner functions, including inner async functions inside `useEffect`, have explicit return types                 | manual review of `useEffect` bodies    | MAJOR    |
| 4.2.4 | `null`/`undefined` handled explicitly — no implicit fallbacks                                                                   | manual review                          | MAJOR    |
| 4.2.5 | TypeScript strict mode is enabled                                                                                               | `cat tsconfig.json` — `"strict": true` | CRITICAL |
| 4.2.6 | `noUnusedLocals: true`, `noUnusedParameters: true` in tsconfig                                                                  | `cat tsconfig.json`                    | MAJOR    |

### 4.3 Type Unions and Domain Values

| #     | Criterion                                                                                                                    | How to verify                                                                | Severity |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------- |
| 4.3.1 | No `string[]` for domain values with known members — use literal union types                                                 | manual review of type definitions                                            | MAJOR    |
| 4.3.2 | No `JSX.Element` in prop interfaces — use `React.ReactNode`                                                                  | `grep -rn "JSX\.Element" src/ --include="*.ts" --include="*.tsx"`            | MAJOR    |
| 4.3.3 | Role arrays in props use `Role` union type — no `allowedRoles: string[]`                                                     | `grep -rn "allowedRoles\|roles.*string\[\]" src/` — empty                    | MAJOR    |
| 4.3.4 | No `Dispatch<SetStateAction<T>>` in hook interfaces — use `(value: T) => void` instead                                       | `grep -rn "Dispatch<SetStateAction" src/` — empty                            | MAJOR    |
| 4.3.5 | Discriminated unions have an explicit discriminant property (e.g. `type: "ack" \| "full-state"`)                             | manual review of union types                                                 | MAJOR    |
| 4.3.6 | SSE event types use a literal union — no `type: string` on event objects                                                     | `grep -rn "type: string" src/` — manual review                               | MAJOR    |
| 4.3.7 | No redundant `?? null` on atoms typed as `T \| null` (never `\| undefined`)                                                  | `grep -rn "?? null" src/shared/store/`                                       | MINOR    |
| 4.3.8 | No redundant union members — e.g. `number \| string \| React.ReactNode` is redundant since `ReactNode` already includes both | manual review of union types in props and interfaces                         | MINOR    |
| 4.3.9 | Role-keyed maps use `Record<Role, string>` — not `Record<string, string>`                                                    | `grep -rn "Record<string, string>" src/` — manual review for role-keyed maps | MAJOR    |

### 4.4 Type Guards

| #     | Criterion                                                                                                                   | How to verify                                   | Severity |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------- |
| 4.4.1 | Type guards reused in 2+ files are extracted to `src/shared/lib/guards.ts`                                                  | manual review of `guards.ts`                    | MINOR    |
| 4.4.2 | Type guards must validate actual response shape — `isRecord(data)` alone is not sufficient; verify specific required fields | manual review of all type guard implementations | CRITICAL |

### 4.5 Environment Variables

| #     | Criterion                                                                                                   | How to verify                                                                           | Severity |
| ----- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- |
| 4.5.1 | Env variables are declared in `ImportMetaEnv` — no `as string \| undefined` to silence missing declarations | `grep -rn "import\.meta\.env\." src/ --include="*.ts" --include="*.tsx"` — manual check | MAJOR    |

---

## 5. Logging

| #   | Criterion                                                                             | How to verify                                                  | Severity |
| --- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------- |
| 5.1 | No `console.log` in application code                                                  | `grep -rn "console\.log" src/` — empty                         | CRITICAL |
| 5.2 | No `console.error` in application code                                                | `grep -rn "console\.error" src/` — empty                       | CRITICAL |
| 5.3 | No `console.warn` in application code                                                 | `grep -rn "console\.warn" src/` — empty                        | CRITICAL |
| 5.4 | No `console.info` in application code                                                 | `grep -rn "console\.info" src/` — empty                        | CRITICAL |
| 5.5 | `clientLogger` from `src/shared/lib/clientLogger.ts` is used everywhere               | `grep -rn "clientLogger" src/` — all logging locations covered | CRITICAL |
| 5.6 | `event` argument in `clientLogger` is a short snake_case string                       | manual review of all `clientLogger` calls                      | MINOR    |
| 5.7 | No manual pre-redaction of sensitive fields — `clientLogger` handles it automatically | manual review                                                  | MINOR    |
| 5.8 | HTTP fetch errors logged with `{ error, ...context }` and error state set             | manual review of API call catch blocks                         | MAJOR    |
| 5.9 | SSE parse errors logged with `{ raw, error }` — not rethrown, stream continues        | manual review of SSE event parsing code                        | MAJOR    |

---

## 6. Naming Conventions

### 6.1 Files and Symbols

| #     | Criterion                                                     | How to verify                                   | Severity |
| ----- | ------------------------------------------------------------- | ----------------------------------------------- | -------- |
| 6.1.1 | Components: `PascalCase` (`GameBoard.tsx`)                    | `ls src/**/*.tsx` — manual review               | MAJOR    |
| 6.1.2 | Hooks: `camelCase` with `use` prefix (`useGameState.ts`)      | `ls src/**/use*.ts`                             | MAJOR    |
| 6.1.3 | Stores: `$` prefix (`$gameStore`)                             | `grep -rn "^export const \$" src/shared/store/` | MAJOR    |
| 6.1.4 | Utility functions: verb-first (`mapPlayerDto`, `buildPlayer`) | manual review                                   | MINOR    |
| 6.1.5 | API DTO types: `Dto` suffix (`PlayerDto`)                     | `grep -rn "Dto" src/shared/types/`              | MINOR    |
| 6.1.6 | Constants: `UPPER_SNAKE_CASE`                                 | manual review                                   | MINOR    |

### 6.2 TypeScript Types

| #     | Criterion                                                                   | How to verify                              | Severity |
| ----- | --------------------------------------------------------------------------- | ------------------------------------------ | -------- |
| 6.2.1 | Interfaces: `PascalCase`, no `I` prefix (not `IGameState`, but `GameState`) | `grep -rn "interface I[A-Z]" src/` — empty | MAJOR    |
| 6.2.2 | `interface` for object shapes, `type` for unions/intersections/aliases      | manual review                              | MINOR    |
| 6.2.3 | Component props defined as `interface` inline in the same file              | manual review                              | MINOR    |
| 6.2.4 | No separate `.types.ts` files for props                                     | `find src -name "*.types.ts"` — empty      | MINOR    |

---

## 7. CSS and Styling

| #   | Criterion                                                                        | How to verify                                                                               | Severity |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------- |
| 7.1 | Every component has a co-located CSS Module file                                 | for each `.tsx` check presence of `.module.css` alongside                                   | MAJOR    |
| 7.2 | CSS class names in `camelCase` (`.btnPrimary`, `.gamePageHeader`)                | `npm run stylelint`                                                                         | MAJOR    |
| 7.3 | No BEM notation in class names (`__`, `--`)                                      | `grep -rn "__\|--" src/ --include="*.module.css"`                                           | MAJOR    |
| 7.4 | No kebab-case class names                                                        | `grep -rn "\.[a-z][a-z]*-[a-z]" src/ --include="*.module.css"`                              | MAJOR    |
| 7.5 | Conditional classes use only `clsx()` — no string concatenation                  | `grep -rn 'className={.*\+' src/` — empty                                                   | MAJOR    |
| 7.6 | CSS class names come from CSS Modules only — no global class name strings inline | `grep -rn 'className="[a-z]' src/ --include="*.tsx"` — manual review for non-module strings | MAJOR    |
| 7.7 | No global CSS except `src/app/styles/index.css`                                  | `find src -name "*.css" ! -name "*.module.css" ! -path "*/styles/index.css"` — empty        | MAJOR    |
| 7.8 | Stylelint passes with no errors                                                  | `npm run stylelint`                                                                         | MAJOR    |

---

## 8. Error Handling

| #   | Criterion                                                                                                       | How to verify                                                           | Severity |
| --- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------- |
| 8.1 | No empty `catch` blocks                                                                                         | `grep -rn "catch.*{}" src/` + manual review                             | CRITICAL |
| 8.2 | No `catch` blocks with only `console.*`                                                                         | `grep -A2 "} catch" src/ -rn` — manual review                           | CRITICAL |
| 8.3 | Every `catch` does one of: remap to typed error / typed failure result / user-safe message + structured log     | manual review of all catch blocks                                       | CRITICAL |
| 8.4 | User-facing errors do not leak internal details                                                                 | manual review of `error-to-user-message.ts`                             | MAJOR    |
| 8.5 | Typed error classes used: `ApiError`, `NetworkError`, `UnauthorizedError`, `TimeoutError`, `ApiValidationError` | `grep -rn "new Error(" src/ --include="*.ts"` — typed variants expected | MAJOR    |

---

## 9. State — Nanostores

| #    | Criterion                                                                                                                                | How to verify                                                                                           | Severity |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------- |
| 9.1  | Stores live only in `src/shared/store/`                                                                                                  | `find src -name "*.ts" -path "*/store/*"`                                                               | MAJOR    |
| 9.2  | Store instances have `$` prefix                                                                                                          | `grep -rn "^export const " src/shared/store/`                                                           | MAJOR    |
| 9.3  | No direct mutations — state changes only via explicit action functions                                                                   | manual review of store files                                                                            | CRITICAL |
| 9.4  | Mutable atoms are not exported directly — export `ReadonlyAtom`, write via action functions only                                         | `grep -rn "^export const \$.*atom(" src/shared/store/` — manual check for direct mutable exports        | CRITICAL |
| 9.5  | Cache atoms have a size limit — no unbounded `Record<id, data>` growth                                                                   | manual review of any cache atoms                                                                        | MAJOR    |
| 9.6  | Nanostores used only for cross-page / truly shared state                                                                                 | manual review — no stores for local UI state                                                            | MAJOR    |
| 9.7  | No double subscription to both a base atom and its derived atom in the same component                                                    | `grep -rn "useStore" src/pages/` — manual review for duplicate subscriptions                            | MAJOR    |
| 9.8  | Transient UI state is local to the component (`useState`)                                                                                | manual review                                                                                           | MINOR    |
| 9.9  | No direct `.set()` on atoms outside their own store file — all writes go through exported action functions                               | `grep -rn "\.set(" src/ --include="*.ts" --include="*.tsx"` — must be empty outside `src/shared/store/` | CRITICAL |
| 9.10 | Error atoms must be cleared only by the operation that caused them — no unconditional `$error.set(null)` in unrelated actions or effects | manual review of all `$error.set(null)` call sites                                                      | MAJOR    |

---

## 10. React

| #    | Criterion                                                                                  | How to verify                                                                     | Severity |
| ---- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | -------- |
| 10.1 | Functional components only — no class components                                           | `grep -rn "extends Component\|extends PureComponent" src/` — empty                | CRITICAL |
| 10.2 | No `React.FC` — plain functions with explicit return types only                            | `grep -rn "React\.FC\|React\.FunctionComponent" src/` — empty                     | MAJOR    |
| 10.3 | No component definitions inside render functions — define components at module level       | manual review of all `.tsx` files for nested `function`/`const` returning JSX     | MAJOR    |
| 10.4 | No `key={index}` on lists that can reorder or change — use stable unique id                | `grep -rn "key={index}\|key={i}" src/ --include="*.tsx"` — empty                  | MAJOR    |
| 10.5 | No empty `id=""` on conditional HTML elements — omit the attribute or use `undefined`      | `grep -rn 'id=""' src/ --include="*.tsx"` — empty                                 | MINOR    |
| 10.6 | Effects that set up subscriptions/listeners/timers return a cleanup function               | manual review of every `useEffect` with side effects other than fetch             | MAJOR    |
| 10.7 | `useLayoutEffect` must use an isomorphic wrapper — no bare `useLayoutEffect` in components | `grep -rn "useLayoutEffect" src/ --include="*.tsx"` — check for non-wrapped usage | MAJOR    |

---

## 11. Performance

| #    | Criterion                                                                                                                               | How to verify                                                                                | Severity |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------- |
| 11.1 | All `useEffect` fetches use `AbortController` — no fetch without cleanup calling `controller.abort()`                                   | `grep -rn "useEffect" src/ --include="*.ts" --include="*.tsx"` — manual review of each fetch | MAJOR    |
| 11.2 | No unused dependencies in `useEffect` dependency array                                                                                  | `npm run eslint` (react-hooks/exhaustive-deps rule)                                          | MAJOR    |
| 11.3 | Prefetch must be gated by user role — no unconditional prefetch for routes the user cannot access                                       | manual review of prefetch logic in route components                                          | MAJOR    |
| 11.4 | No redundant `useEffect` dependencies — derived values must not be listed alongside their source (e.g. both `items` and `items.length`) | `npm run eslint` (react-hooks/exhaustive-deps) + manual review                               | MINOR    |

---

## 12. API Client

| #    | Criterion                                                                                 | How to verify                                                          | Severity |
| ---- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------- |
| 12.1 | All API calls go through `apiClient<T>()` from `src/shared/api/client.ts`                 | `grep -rn "fetch(" src/ --include="*.ts"` — only inside client.ts      | CRITICAL |
| 12.2 | Every `apiClient` call provides a `validate:` type guard                                  | manual review of all calls in `src/shared/api/*.ts`                    | CRITICAL |
| 12.3 | No bare `data as T` — all API client generics carry a `validate` function                 | `grep -rn "data as " src/shared/api/` — empty                          | CRITICAL |
| 12.4 | No manual timeout on top of the built-in 30s                                              | `grep -rn "setTimeout.*fetch\|AbortSignal.timeout" src/shared/api/`    | MAJOR    |
| 12.5 | Error types imported from `@/shared/api`                                                  | `grep -rn "from.*errors" src/`                                         | MAJOR    |
| 12.6 | Raw DTOs are never passed directly to UI                                                  | manual review of mappers in `src/shared/api/`                          | CRITICAL |
| 12.7 | Mapper functions are pure and have unit tests                                             | check for `.test.ts` file alongside each mapper                        | MAJOR    |
| 12.8 | Mapping happens only at the API boundary (`shared/api/`) — no mapping in pages            | manual review                                                          | MAJOR    |
| 12.9 | No duplicated endpoint constants across sibling modules — single source in `endpoints.ts` | `grep -rn "'/api/" src/shared/api/*.ts` — manual review for duplicates | MAJOR    |

---

## 13. Code Reuse

| #    | Criterion                                                                                                                       | How to verify                                                              | Severity |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------- |
| 13.1 | Type guards used in 2+ files are extracted to `src/shared/lib/guards.ts`                                                        | manual review of inline type guards                                        | MINOR    |
| 13.2 | Shared location state utilities live in `src/shared/lib/locationState.ts`                                                       | `cat src/shared/lib/locationState.ts` — file exists if the pattern is used | MINOR    |
| 13.3 | Shared business logic used in 2+ pages must be extracted to a shared mapper in `src/shared/` — no duplication across page hooks | manual review of logic shared between page hooks                           | MAJOR    |

---

## 14. Testing

### 14.1 File Location

| #      | Criterion                                                        | How to verify                                    | Severity |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------ | -------- |
| 14.1.1 | Test files are co-located with source (`.test.ts` / `.test.tsx`) | `find src -name "*.test.*"` — all next to source | MAJOR    |
| 14.1.2 | No `__tests__` folders                                           | `find src -type d -name "__tests__"` — empty     | MAJOR    |

### 14.2 Test Structure

| #      | Criterion                                                                                | How to verify                                            | Severity |
| ------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------- |
| 14.2.1 | Every test file declares vitest environment: `// @vitest-environment jsdom` or `node`    | `grep -rL "@vitest-environment" src/**/*.test.ts`        | MAJOR    |
| 14.2.2 | Structure: `describe("<unit>") → it("should <behavior>")`                                | manual review                                            | MAJOR    |
| 14.2.3 | `it()` used, not `test()`                                                                | `grep -rn "^\s*test(" src/ --include="*.test.*"` — empty | MINOR    |
| 14.2.4 | `vi.mock()` calls placed before imports (hoisting requirement)                           | manual review of files with mocks                        | MAJOR    |
| 14.2.5 | Test data created via factory builders (`buildPlayer()`) — no raw inline object literals | manual review of test files                              | MAJOR    |
| 14.2.6 | `beforeEach` for mock resets; `afterEach` only when cleanup is mandatory                 | manual review                                            | MINOR    |
| 14.2.7 | Async: `waitFor()` and `act()` from Testing Library — no arbitrary `setTimeout` delays   | `grep -rn "setTimeout" src/ --include="*.test.*"`        | MAJOR    |
| 14.2.8 | Test names follow `"should <behavior> when <condition>"` pattern                         | manual review of `it()` descriptions                     | MINOR    |

### 14.3 Mock Boundaries

| #      | Criterion                                                                                                                            | How to verify                                                                    | Severity |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | -------- |
| 14.3.1 | Only external boundaries mocked: API, browser APIs, time                                                                             | manual review of `vi.mock()` calls                                               | MAJOR    |
| 14.3.2 | Internal business logic is never mocked                                                                                              | manual review                                                                    | MAJOR    |
| 14.3.3 | Nanostore atoms must not be spied on via `vi.spyOn(atom, "set")` — assert observable behavior (rendered output, store state) instead | `grep -rn "spyOn.*\.set\|spyOn.*atom" src/ --include="*.test.*"` — must be empty | MAJOR    |
| 14.3.4 | Tests must assert observable behavior — not internal logger output format or third-party library internals                           | manual review of `expect()` assertions in test files                             | MAJOR    |

### 14.4 Coverage Thresholds

| #      | Criterion        | How to verify      | Severity |
| ------ | ---------------- | ------------------ | -------- |
| 14.4.1 | Lines ≥ 75%      | `npm run coverage` | MAJOR    |
| 14.4.2 | Functions ≥ 70%  | `npm run coverage` | MAJOR    |
| 14.4.3 | Branches ≥ 65%   | `npm run coverage` | MAJOR    |
| 14.4.4 | Statements ≥ 75% | `npm run coverage` | MAJOR    |

---

## 15. Imports and Aliases

| #    | Criterion                                                                      | How to verify                                                               | Severity |
| ---- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | -------- |
| 15.1 | Most specific alias used: `@/lib/clientLogger` not `@/shared/lib/clientLogger` | `grep -rn "from '@/shared/lib/" src/`                                       | MINOR    |
| 15.2 | Shared types imported from `@/types` barrel, not from deep paths               | `grep -rn "from '@/shared/types/" src/` — empty                             | MAJOR    |
| 15.3 | No cross-page imports                                                          | `npm run eslint` (no-restricted-imports)                                    | CRITICAL |
| 15.4 | No imports from `@/app` in `pages` or `shared`                                 | `grep -rn "from '@/app" src/pages/ src/shared/` — empty                     | CRITICAL |
| 15.5 | `index.ts` barrel files only in `src/shared/ui/<name>/`                        | `find src/pages -name "index.ts"` + `find src/app -name "index.ts"` — empty | MAJOR    |

---

## 16. UI Kit (`shared/ui/`)

| #    | Criterion                                                  | How to verify                                     | Severity |
| ---- | ---------------------------------------------------------- | ------------------------------------------------- | -------- |
| 16.1 | Each UI component in `shared/ui/` has an `index.ts` barrel | `ls src/shared/ui/` — every folder has `index.ts` | MAJOR    |
| 16.2 | UI components contain no business logic                    | manual review                                     | MAJOR    |
| 16.3 | UI components do not import from `pages`                   | `grep -rn "from '@/pages" src/shared/ui/` — empty | CRITICAL |

---

## 17. Git and Process

| #    | Criterion                                   | How to verify                                                | Severity |
| ---- | ------------------------------------------- | ------------------------------------------------------------ | -------- |
| 17.1 | Commit messages follow Conventional Commits | `git log --oneline -20` — manual review                      | MAJOR    |
| 17.2 | No `Co-Authored-By:` trailers in commits    | `git log --format="%B" -20 \| grep "Co-Authored-By"` — empty | MAJOR    |
| 17.3 | Pre-push hook is active (`.husky/pre-push`) | `cat .husky/pre-push`                                        | MINOR    |

---

## 18. Tooling — Configuration

| #    | Criterion                                  | How to verify            | Severity |
| ---- | ------------------------------------------ | ------------------------ | -------- |
| 18.1 | ESLint passes with no errors               | `npm run eslint`         | CRITICAL |
| 18.2 | TypeScript typecheck passes with no errors | `npm run typecheck`      | CRITICAL |
| 18.3 | Prettier passes with no errors             | `npm run prettier:check` | MAJOR    |
| 18.4 | Stylelint passes with no errors            | `npm run stylelint`      | MAJOR    |
| 18.5 | Build passes with no errors                | `npm run build`          | CRITICAL |
| 18.6 | All unit tests pass                        | `npm run test`           | CRITICAL |
| 18.7 | No secret leaks                            | `npm run secrets:check`  | CRITICAL |
| 18.8 | E2E tests pass                             | `npm run test:e2e`       | MAJOR    |
| 18.9 | No dead code (dead exports)                | `npx knip`               | MINOR    |

---

## How to Run an Audit

### Quick automated pass (5 minutes)

```bash
npm run typecheck && npm run eslint && npm run stylelint && npm run prettier:check && npm run test && npm run build
```

### CRITICAL grep checks (run from repo root)

```bash
# Logging violations
grep -rn "console\.\(log\|error\|warn\|info\)" src/

# TypeScript violations
grep -rn ": any" src/ --include="*.ts" --include="*.tsx"
grep -rn "!\." src/ --include="*.ts" --include="*.tsx"
grep -rn " as .* as " src/                                     # chained casts
grep -rn "location\.state as" src/                             # unsafe location.state cast
grep -rn "@ts-ignore\|@ts-nocheck" src/
grep -rn "React\.FC\|React\.FunctionComponent" src/
grep -rn "JSX\.Element" src/ --include="*.ts" --include="*.tsx"
grep -rn "allowedRoles\|roles.*string\[\]" src/                # role arrays as string[]
grep -rn "Dispatch<SetStateAction" src/                        # React internals in interfaces
grep -rn "data as " src/shared/api/                            # bare data casts in API

# Architecture violations
grep -r "from '@/pages" src/shared/
grep -r "from '@/app" src/shared/ src/pages/
grep -rn "from '@/shared/types/" src/
grep -rn "jsdom\|__TEST__\|process\.env\.NODE_ENV.*test" src/ --include="*.ts" --include="*.tsx"

# React violations
grep -rn "key={index}\|key={i}" src/ --include="*.tsx"
grep -rn 'id=""' src/ --include="*.tsx"
grep -rn 'className="[a-z]' src/ --include="*.tsx"            # global class strings

# Store violations
grep -rn "\.get()" src/pages/ src/app/                        # .get() outside store files

# Dead structure
find src -type d -name "__tests__"
find src/pages -name "index.ts"
grep -rn "extends Component\|extends PureComponent" src/

# New rules
grep -rn "useLayoutEffect" src/ --include="*.tsx"            # must use isomorphic wrapper
grep -rn "parseInt(" src/ --include="*.ts" --include="*.tsx" # must have radix 10
grep -rn "new EventSource\|createSSEConnection" src/pages/   # duplicate SSE connections
grep -rn "Record<string, string>" src/                        # role-keyed maps should use Record<Role,string>
grep -rn "^export type .* = [A-Z]" src/ --include="*.ts"     # trivial type aliases
grep -rn "\.set(" src/ --include="*.ts" --include="*.tsx"   # .set() outside store files
grep -rn "\$error\.set(null)" src/                           # unconditional error atom clears
grep -rn "spyOn.*\.set\|spyOn.*atom" src/ --include="*.test.*"  # vi.spyOn on atoms
```

### Manual review checklist

- [ ] Every `catch` block contains meaningful error handling
- [ ] Every `as` cast has a preceding full type guard (not a partial object check)
- [ ] Every `useEffect` with fetch passes `AbortSignal` and cleans up
- [ ] Inner async functions inside `useEffect` have explicit return types
- [ ] Every `apiClient` call includes `validate:`
- [ ] No mutable atom is exported directly from a store file
- [ ] Cache atoms have a bounded size
- [ ] Mapper functions have unit tests
- [ ] No component subscribes to both a base atom and its derived atom
- [ ] Global singleton handlers are guarded against duplicate calls
- [ ] `Number(id)` results guarded against `NaN`; route params validated with `> 0`
- [ ] Route data fetching does not fire for unauthenticated users
- [ ] Per-route `<Suspense>` and `errorElement` are in place
- [ ] No component definitions inside render functions
- [ ] No magic numbers/hardcoded domain values in JSX
- [ ] All async function code paths have explicit handling
- [ ] No dead props in component interfaces (props never read in component body)
- [ ] No dead return values from hooks (fields never used by any consumer)
- [ ] `useLayoutEffect` uses an isomorphic wrapper, not bare `useLayoutEffect`
- [ ] Nanostore values inside `useEffect` read via reactive subscription, not `.get()`
- [ ] Navigation side effects guarded against repeat calls
- [ ] No duplicate SSE connections — using shared `useRoomStream` hook
- [ ] Prefetch gated by user role
- [ ] `parseInt` calls include explicit radix 10
- [ ] Type guards validate full response shape, not just `isRecord`
- [ ] No trivial type export aliases (`export type X = Y` with no added semantics)
- [ ] No truthy checks on `number` types — use `!== undefined` or `!== null`
- [ ] Environment-capability checks catch the specific error mode (e.g. `SecurityError`)
- [ ] `??` fallbacks on domain values use named constants; missing data surfaces error/loading state
- [ ] No redundant `return;` at end of `void` function's `catch` block
- [ ] No `.set()` on atoms outside their store file
- [ ] Error atoms cleared only by the operation that caused them
- [ ] Tests assert observable behavior, not internal logger format or library internals
- [ ] No `vi.spyOn(atom, "set")` — assert rendered output or store state instead

---

## Severity Legend

| Level        | Description                                                  |
| ------------ | ------------------------------------------------------------ |
| **CRITICAL** | Breaks architecture, type safety, or security. Blocks merge. |
| **MAJOR**    | Violates project conventions. Must be fixed before merge.    |
| **MINOR**    | Desirable fix, does not block merge.                         |
