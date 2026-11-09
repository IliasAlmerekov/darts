import type { TabletGame } from "@/shared/api/game";
import { parseRouteId, routeIdOrNotFound } from "./routeId";
import { ROUTES } from "./routes";

/** The admin routes that follow the tablet game. */
export type TabletGameRouteKind = "start" | "game" | "settings";

/** Parses a game id from the URL with the rules of `parseRouteId`. */
export function parseRouteGameId(gameIdParam: string | undefined): number | null {
  return parseRouteId(gameIdParam);
}

/**
 * Reads the game id of a route loader. A route without an id param returns null; an id that
 * `parseRouteGameId` rejects throws a 404 route error response, so the loader sends no request.
 */
export function routeGameIdOrNotFound(gameIdParam: string | undefined): number | null {
  return gameIdParam === undefined ? null : routeIdOrNotFound(gameIdParam);
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
