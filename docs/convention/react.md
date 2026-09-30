# React

Rules for React components, hooks, and effects in this project. Source-of-truth: must be
checked against `src/` before changing.

## Components

- **Functional only.** No class components. `extends Component` / `extends PureComponent`
  must not appear in `src/`. The router error element (`src/app/ErrorBoundary.tsx`) uses
  `useRouteError()` and is functional too -- there are no class-based React error
  boundaries in this project.
- **No `React.FC` / `React.FunctionComponent`.** Plain function declarations with explicit
  return types: `function Foo(props: FooProps): React.JSX.Element { ... }` (see
  `typescript.md` for the full return-type rule).
- **Module-level only.** Components are declared at module scope -- never inside another
  component's body. Nested factory components break referential identity and cause
  remounts.
- **Props as a local `interface`.** `interface FooProps { ... }` lives in the same file
  as `Foo`. Do not split into `*.types.ts` (see `typescript.md`).
- **`children` is `React.ReactNode`** -- not `JSX.Element` (see `typescript.md`).

## Memoization

`React.memo` is used liberally for stable presentational components. Three accepted forms:

```tsx
// 1. Inline named (preferred when the component is tiny and lives near use)
const HeaderSection = React.memo(function HeaderSection({ title }: HeaderSectionProps) {
  return <h1>{title}</h1>;
});

// 2. Wrap-and-export (preferred when the component body is long)
function NavigationBar(props: NavigationBarProps): React.JSX.Element { ... }
export default React.memo(NavigationBar);

// 3. Custom equality (only when default shallow compare is wrong)
export const LivePlayersList = React.memo(LivePlayersListComponent, (prev, next) => {
  // structural compare here
});
```

Rules:

- `React.memo` is the project convention. Avoid bare `memo` imports unless the file
  already imports `memo` from "react" for other reasons.
- Custom equality functions stay short and structural -- if you reach for deep compare,
  the prop shape probably needs splitting first.
- Do not memoize a component that always receives unstable callback / object props -- the
  memo will never hit. Stabilise the callsite first.

## Refs

- `useRef<T>(initial)` for mutable values that must survive renders without triggering
  rerenders (request-id counters, latest-snapshot caches, dispose flags).
- `React.forwardRef<HTMLElement, Props>(...)` for components that wrap a single DOM
  element and must allow parent refs to reach it (see `src/shared/ui/pagination/Pagination.tsx`).
- Refs updated inside `useEffect` must not be read synchronously in the same render --
  update the ref synchronously (e.g. inside an event handler) or derive the value
  directly.

## Hooks

- **Naming:** `use<PascalNoun>` -- `useGameState`, `useThrowQueue`, `useAuthenticatedUser`.
  Lower-case `use` prefix is mandatory for the rules-of-hooks lint to apply.
- **Location:** page-private hooks live next to the page (`src/pages/<Page>/use*.ts`).
  Cross-page hooks live in `src/shared/hooks/`. There is no in-between -- if 2+ pages
  need it, move it to `shared/hooks/`.
- **Return shape:** when a hook returns more than one value, declare an explicit
  `interface Use<Name>Return { ... }` and annotate the hook return type. Pattern is used
  throughout `src/pages/GamePage/throws/`.
- **Pure helpers belong in `lib/`, not in hooks.** A `use*` file should contain hooks --
  if the body is just a pure function, move it to `lib/`.

## Effects

- **Cleanup is mandatory** for subscriptions, listeners, timers, intervals, and
  `EventSource`. Return a function from the effect that undoes every side effect started
  inside it. See `src/shared/hooks/useEventSource.ts` for the canonical dispose pattern
  with an `isDisposed` flag and a `cleanupSource` capture.
- **Fetches inside effects use `AbortController`.** Pass `controller.signal` to the API
  function and call `controller.abort()` in the cleanup:

  ```ts
  useEffect(() => {
    const controller = new AbortController();
    void fetchGameData(controller.signal);
    return () => controller.abort();
  }, [fetchGameData]);
  ```

- **`useLayoutEffect`** must always go through `useIsomorphicLayoutEffect` from
  `@/lib/useIsomorphicLayoutEffect`. Direct `useLayoutEffect` import is forbidden in
  components -- it breaks SSR / Vitest `node` environments.
- **Dependencies are exhaustive.** `react-hooks/exhaustive-deps` is on; do not silence
  it. If a value should not retrigger an effect, derive it differently (ref, store snapshot
  via `.get()`, restructure into multiple effects).
- **No redundant deps.** Listing both `items` and `items.length` in the same dep array is
  redundant -- the second is derived from the first.

## Reading store state in components and hooks

Cross-references with `state.md`:

- For values that drive rendering or memo deps -- `useStore($atom)`.
- For one-shot reads inside event handlers, async callbacks, route loaders, and
  effect bodies that compare-then-decide -- `$atom.get()`.
- Forbidden: `$atom.get()` inside `useMemo`, or feeding render output from a `.get()`
  snapshot. See `state.md` for full rules.

## Lists

- `key={...}` must be a stable id, not the array index. The only accepted exception is
  static placeholder lists (skeletons, fixed-length decorative arrays) where the rendered
  element never reorders, never changes count, and is purely visual. Today the only such
  case is `src/shared/ui/skeletons/StartPageSkeleton.tsx`.
- Do not use a stringified concatenation of unstable fields as a key (`${name}-${score}`)
  unless those fields are guaranteed unique and immutable for the row's lifetime.

## Conditional attributes

- No empty string attributes on optional elements. `id={someId}` -- when `someId` is
  undefined the attribute is omitted automatically. Never `id=""`.
- For optional handler props pass `undefined`, not no-op functions, unless the consumer
  documents that a handler is required.

## Routing-related components

The router itself is documented in `architecture.md`. The components under `src/app/`
follow these additional rules:

- **`ProtectedRoutes`** wraps routes in `App.tsx` with a typed `allowedRoles?: Role[]`
  prop (default: `["ROLE_ADMIN"]`). While auth is checking, it returns the
  page-appropriate skeleton from `@/shared/ui/skeletons` -- not a generic spinner. After
  the check it renders `<Outlet />` or `<Navigate />`.
- **`ScrollToTop`** is a side-effect-only component that returns `null`. Pattern: read
  `location.pathname` via `useLocation()`, scroll on change, log fallback failures
  through `clientLogger`. Replicate this shape if you need similar side-effect mounters.
- **`ErrorBoundary`** in `src/app/ErrorBoundary.tsx` is the React Router 6 `errorElement`,
  not a true React error boundary. It uses `useRouteError()` and `isRouteErrorResponse`.
  Every `<Route>` references it (see `architecture.md`). Do not introduce a class-based
  boundary -- if you need one, talk it through first.

## Verification

ESLint (`react`, `react-hooks`, `jsx-a11y` plugins) and TypeScript catch most rules. Two
extra greps for things lint does not see:

**1. Bare `useLayoutEffect` outside the wrapper file**:

```bash
rg -nP '\buseLayoutEffect\b' src --glob '!src/shared/lib/useIsomorphicLayoutEffect.ts' --glob '!**/*.test.{ts,tsx}'
```

**2. `key={index}` / `key={i}` in JSX outside the documented skeleton exception**:

```bash
rg -nP 'key=\{(index|i)\}' src --glob '!src/shared/ui/skeletons/**'
```

A clean run of both prints nothing.
