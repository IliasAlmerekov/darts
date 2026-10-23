# React

Rules for React components, hooks, and effects in this project.

## Components

- Components are plain function declarations with an explicit return type:
  `function Foo(props: FooProps): React.JSX.Element { ... }`. `React.FC` and
  `React.FunctionComponent` are not used (see `typescript.md` for the return-type rule).
- Props are a local `interface FooProps { ... }` in the same file as `Foo`, never a
  `*.types.ts` file.

## Memoization

`React.memo` is the convention; `memo` imported bare from `"react"` is not
(`Keyboard.tsx` still does; #215 fixes it). Three forms:

```tsx
// 1. Inline named (tiny component near its use)
const GamesPagination = React.memo(function GamesPagination({ ... }: GamesPaginationProps) { ... });

// 2. Wrap-and-export (long component body)
function JoiningScreen(props: JoiningScreenProps): React.JSX.Element { ... }
export default React.memo(JoiningScreen);

// 3. Custom equality, only when the default shallow compare is wrong
export const LivePlayersList = React.memo(LivePlayersListComponent, (prev, next) => {
  // short structural compare
});
```

## Refs

A component that renders a single DOM element a parent must reach takes `ref` as a normal
prop: its props type includes `React.ComponentProps<"ul">`, which carries `ref`, and the
component spreads the props onto the element (`PaginationContent` in
`src/shared/ui/pagination/Pagination.tsx`). `React.forwardRef` is
not used.

## Hooks

- **Location:** a page-private hook lives next to its page (`src/pages/<Page>/use*.ts`). A
  hook used by 2+ pages moves to `src/shared/hooks/`. App-shell hooks live in `src/app/`
  (`useStatisticsPrefetch.ts`).
- **Return shape:** a hook that returns more than one value declares
  `interface Use<Name>Return { ... }` and annotates its return type with it
  (`src/pages/GamePage/throws/useThrowQueue.ts`).
- **Pure helpers belong in `lib/`.** A `use*` file holds hooks; a pure function moves to
  the page's `lib/` or `src/shared/lib/`.

## Server reads

Server reads go through TanStack Query: `docs/convention/api.md`, "Server reads: TanStack
Query". The rules below cover the fetches still made in effects (the game page's throw
queue, optimistic throws, and undo).

## Effects

- `src/shared/hooks/useEventSource.ts` is the cleanup pattern for subscriptions: an
  `isDisposed` flag plus a captured `cleanupSource` that the effect's cleanup calls.
- A fetch inside an effect gets an `AbortController`: pass `controller.signal` to the API
  function and abort in the cleanup.

  ```ts
  useEffect(() => {
    const controller = new AbortController();
    void fetchGameData(controller.signal);
    return () => controller.abort();
  }, [fetchGameData]);
  ```

- Layout effects use `useIsomorphicLayoutEffect` from `@/lib/useIsomorphicLayoutEffect`;
  `useLayoutEffect` is imported only by that wrapper, because it breaks Vitest `node`
  environments.
- `react-hooks/exhaustive-deps` stays on, with no disable comments. A value that must not
  retrigger an effect goes in a ref, a `.get()` store snapshot, or a separate effect.

## Reading store state

Full rules in `state.md`:

- A value that drives rendering or memo deps: `useStore($atom)`.
- A one-shot read inside an event handler, async callback, route loader, or an effect body
  that compares then decides: `$atom.get()`.
- `$atom.get()` never feeds render output or a `useMemo`.

## Lists

`key` is a stable id. The one exception is a static placeholder list that never reorders or
changes count; today that is only `src/shared/ui/skeletons/StartPageSkeleton.tsx`.

## Routing components

The router itself is in `architecture.md`. The components under `src/app/`:

- **`ProtectedRoutes`** wraps routes in `App.tsx` with a typed `allowedRoles?: Role[]` prop
  (default `["ROLE_ADMIN"]`). While auth is checking, it returns the page's skeleton
  from `@/shared/ui/skeletons`, not a spinner. After the check it renders `<Outlet />` or
  `<Navigate />`.
- **`ScrollToTop`** is a side-effect-only component that returns `null`: it reads
  `location.pathname` via `useLocation()`, scrolls on change, and logs fallback failures
  through `clientLogger`. A new side-effect mounter copies this shape.
- **`ErrorBoundary`** in `src/app/ErrorBoundary.tsx` is the React Router `errorElement`, a
  function component on `useRouteError()` and `isRouteErrorResponse`. Every `<Route>`
  references it. A class-based boundary needs the user's approval first.
- **`TabletGameGate`** in `src/app/routes/` wraps the pages of `/start`, `/game`,
  `/settings` and `/summary`. It renders the page once the loader has read the tablet game and shows an
  error with Retry when that read failed.

## Verification

ESLint (`react`, `react-hooks`, `jsx-a11y`) and TypeScript catch most rules. A clean run of
each command prints nothing.

**1. `useLayoutEffect` outside the wrapper file:**

```bash
rg -n '\buseLayoutEffect\b' src --glob '!src/shared/lib/useIsomorphicLayoutEffect.ts' --glob '!**/*.test.{ts,tsx}'
```

**2. Index keys outside the skeleton exception:**

```bash
rg -n 'key=\{(index|i|idx)\}' src --glob '!src/shared/ui/skeletons/**'
```
