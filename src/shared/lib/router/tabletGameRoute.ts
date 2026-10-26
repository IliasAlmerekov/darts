import type { TabletGame } from "@/shared/api/game";
import { ROUTES } from "./routes";

/** The admin routes that follow the tablet game. */
export type TabletGameRouteKind = "start" | "game" | "settings";

const POSITIVE_INTEGER = /^[1-9]\d*$/;

/**
 * Parses a game id from the URL. Only a positive safe integer in plain digits counts:
 * `-5`, `0`, `abc` and `1e3` are invalid and return null.
 */
export function parseRouteGameId(gameIdParam: string | undefined): number | null {
  if (gameIdParam === undefined || !POSITIVE_INTEGER.test(gameIdParam)) {
    return null;
  }

  const gameId = Number(gameIdParam);
  return Number.isSafeInteger(gameId) ? gameId : null;
}

/**
 * Reads the game id of a route loader. A route without an id param returns null; an id that
 * `parseRouteGameId` rejects throws a 404 route error response, so the loader sends no request.
 */
export function routeGameIdOrNotFound(gameIdParam: string | undefined): number | null {
  const gameId = parseRouteGameId(gameIdParam);
  if (gameIdParam !== undefined && gameId === null) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }
  return gameId;
}

/** The path of the tablet game on an admin route: the page a nav link or a redirect opens. */
export function tabletGamePath(kind: TabletGameRouteKind, tabletGame: TabletGame | null): string {
  if (kind === "settings") {
    return ROUTES.settings(tabletGame?.id);
  }
  if (tabletGame === null) {
    return ROUTES.start();
  }
  return tabletGame.status === "started" ? ROUTES.game(tabletGame.id) : ROUTES.start(tabletGame.id);
}

function routePath(kind: TabletGameRouteKind, gameId: number | null): string {
  if (kind === "settings") {
    return ROUTES.settings(gameId ?? undefined);
  }
  if (kind === "game" && gameId !== null) {
    return ROUTES.game(gameId);
  }
  return ROUTES.start(gameId ?? undefined);
}

/**
 * Maps an admin route to the path of the tablet game. Returns null when the route already
 * shows it. `gameId` is the valid id of the URL, or null for a route without one; the loaders
 * reject an invalid id with `routeGameIdOrNotFound` before they call this.
 */
export function resolveTabletGameRoute(
  kind: TabletGameRouteKind,
  gameId: number | null,
  tabletGame: TabletGame | null,
): string | null {
  const target = tabletGamePath(kind, tabletGame);
  return routePath(kind, gameId) === target ? null : target;
}
