# Server reads go through TanStack Query; session state stays in Nanostores

Each read hook used to guard against late responses on its own, with an `AbortController`, an in-flight ref, or a request id. Several bugs came from guards that were missing or wrong (#99, #107, #110). Server reads now go through TanStack Query, keyed by resource (`['auth', 'me']`, `['stats', 'players', { limit, offset, sortParam }]`), so a late response can only update its own key. `client.ts` stays the fetch function underneath, timeout included.

State that the client owns stays in Nanostores: the current game id, the room store, and the game store. The query cache is the single source for the authenticated user; there is no `$user` mirror.

Route loaders stay the entry point for data that depends on route params. A loader fills the cache with `queryClient.ensureQueryData(...)`, and the page reads the same key with `useQuery`. Data whose key changes inside the page, such as statistics pagination, uses `useQuery` alone.

## Considered options

- Keep everything in Nanostores and share one guard helper. Rejected: it still leaves every hook to remember the helper, and caching, prefetch and invalidation would be rebuilt by hand.
- Replace route loaders with `useQuery` in the page. Rejected: loaders already start the fetch before the page renders, and `docs/convention/architecture.md` requires them for page-level data.
- Move the throw queue, optimistic throws and undo on the game page to queries as well. Rejected for now: their reconciliation logic is owned by #123 and is not a plain read.

## Consequences

- `QueryClient` defaults match the old behaviour: no retry, no refetch on window focus or reconnect, `staleTime: 0`. A page that wants more opts in per query.
- The Nanostores auth store (`$user`, `$authChecked`, `$authError`) is removed in #157. `docs/convention/state.md` still shows it as the layout example until then.
- Logout and the 401 handler call `queryClient.clear()`, because every cached read belongs to the old session.
