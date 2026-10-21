import { replace, type LoaderFunction } from "react-router-dom";
import type { TabletGameResponse } from "@/shared/api/game";
import { resolveTabletGameRoute, type TabletGameRouteKind } from "@/lib/router/tabletGameRoute";
import { gameQueries } from "@/shared/query/game.queries";
import { queryClient } from "@/shared/query/queryClient";

/**
 * Reads the tablet game fresh for a route loader. Returns null when the read fails: the query
 * function logged it, and `TabletGameGate` shows the error with Retry.
 */
export async function fetchTabletGame(): Promise<TabletGameResponse | null> {
  return queryClient.fetchQuery(gameQueries.tablet()).catch(() => null);
}

/**
 * Builds the loader of an admin route that follows the tablet game. It redirects, replacing the
 * history entry, when the URL shows another game or an invalid id.
 */
export function tabletGameLoader(kind: TabletGameRouteKind): LoaderFunction {
  return async ({ params }) => {
    const tabletGame = await fetchTabletGame();
    if (tabletGame === null) {
      return null;
    }

    const target = resolveTabletGameRoute(kind, params.id, tabletGame.game);
    return target === null ? null : replace(target);
  };
}
