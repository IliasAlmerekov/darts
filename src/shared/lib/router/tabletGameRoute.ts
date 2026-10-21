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
 * shows it; an invalid id in the URL never does.
 */
export function resolveTabletGameRoute(
  kind: TabletGameRouteKind,
  gameIdParam: string | undefined,
  tabletGame: TabletGame | null,
): string | null {
  const target = tabletGamePath(kind, tabletGame);
  const gameId = parseRouteGameId(gameIdParam);
  if (gameIdParam !== undefined && gameId === null) {
    return target;
  }

  return routePath(kind, gameId) === target ? null : target;
}
