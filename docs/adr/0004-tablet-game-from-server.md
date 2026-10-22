# The admin routes read the tablet game from the server

Status: accepted (#203).

The admin routes `/start`, `/game` and `/settings` used to take the game from `$currentGameId`, which session storage persisted. The Settings page wrote any id from `/settings/<id>` into that store. After a visit to `/settings/<finished game id>`, the Game tab linked to `/start/<that id>`, `startPageLoader` redirected to the same URL again, and the admin could neither create nor start a game until they logged out.

The server now owns the tablet game. `GET /api/tablet/game` (darts-backend#132) returns the one game on the tablet that is in the lobby or started, or none. The client reads it through `gameQueries.tablet()` (ADR 0001) and checks the body with a Valibot schema (ADR 0002).

## Rules

- No code writes the tablet game from a URL. A game id in the URL is only a request to show that game.
- Each admin route loader reads the tablet game fresh on every navigation and passes the id param to `resolveTabletGameRoute`. When the URL shows another game, the loader redirects with `replace()`. The loader of the redirect target reuses that read instead of sending a second request.
- `startPageLoader` takes the server's answer into the room store, so the start page never shows the invitation of a game that has finished since. When the game starts between the tablet game read and the lobby read, it redirects to `/game/<id>`.
- `parseRouteGameId` is the one parser for route ids. It accepts positive safe integers written as plain digits. An invalid id (`-5`, `0`, `abc`, `1e3`) counts as a foreign id.
- While the read is pending on a cold load, the route shows a skeleton. When the read fails, `TabletGameGate` shows an error with Retry and redirects nowhere.
- The navigation bar builds its Game and Settings links from the tablet game with `tabletGamePath`. `AdminLayoutRoute` reads the tablet game again when it mounts, unless a loader read it less than a second ago or the last read failed. The game can finish on `/game` or `/summary`, outside the layout, and `/statistics`, `/games` and `/details` have no tablet game loader.
- `/summary/<id>` shows only the last finished game, `lastFinishedGameId` from the same read. Another id moves to `/details/<id>` with `replace()`, so an older game never offers Undo or Rematch.
- When Undo, Rematch or rematch start answers 409 `GAME_NOT_NEWEST`, the summary shows "This game can no longer be changed." and then opens `tabletGamePath` of the cached tablet game. The target's loader redirects again if that read is out of date. A successful Undo, Rematch or room create invalidates the tablet game query.
- A player's current game (login, `/joined`, invitation) keeps its own source and does not change here.

## Considered options

- Keep the tablet game in session storage and guard each write. Rejected: any page with an id in the URL could still corrupt it, and a new tab started with no value at all.

## Consequences

- Every admin navigation sends one request for the tablet game, and the previous page stays on screen until the loader finishes.
- On a cold load the layout and the route loader share one in-flight request.
- Every summary visit reads the tablet game too, and the summary waits for that read before it renders.
