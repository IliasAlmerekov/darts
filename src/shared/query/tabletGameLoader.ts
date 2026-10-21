import { replace, type LoaderFunction } from "react-router-dom";
import type { TabletGameResponse } from "@/shared/api/game";
import { resolveTabletGameRoute, type TabletGameRouteKind } from "@/lib/router/tabletGameRoute";
import { gameQueries } from "@/shared/query/game.queries";
import { queryClient } from "@/shared/query/queryClient";

// The loader of the redirect target runs right after the redirect.
const REDIRECT_READ_MS = 1_000;

// The read behind the last redirect. The target route's loader reuses it once, so a redirect
// costs one request, not two in a row.
let lastRedirect: { pathname: string; dataUpdatedAt: number } | null = null;

function takeRedirectRead(pathname: string): TabletGameResponse | null {
  const redirect = lastRedirect;
  lastRedirect = null;
  const state = queryClient.getQueryState(gameQueries.tablet().queryKey);
  if (
    redirect?.pathname !== pathname ||
    state?.data === undefined ||
    state.dataUpdatedAt !== redirect.dataUpdatedAt ||
    Date.now() - state.dataUpdatedAt >= REDIRECT_READ_MS
  ) {
    return null;
  }
  return state.data;
}

/**
 * Reads the tablet game fresh for the loader of `request`. Returns null when the read fails:
 * the query function logged it, and `TabletGameGate` shows the error with Retry.
 */
export async function fetchTabletGame(request: Request): Promise<TabletGameResponse | null> {
  const redirectRead = takeRedirectRead(new URL(request.url).pathname);
  if (redirectRead !== null) {
    return redirectRead;
  }

  return queryClient.fetchQuery(gameQueries.tablet()).catch(() => null);
}

/** Redirects to `target`, replacing the history entry, and hands the read to its loader. */
export function redirectToTabletGame(target: string): Response {
  const state = queryClient.getQueryState(gameQueries.tablet().queryKey);
  lastRedirect =
    state === undefined ? null : { pathname: target, dataUpdatedAt: state.dataUpdatedAt };
  return replace(target);
}

/**
 * Builds the loader of an admin route that follows the tablet game. It redirects, replacing the
 * history entry, when the URL shows another game or an invalid id.
 */
export function tabletGameLoader(kind: TabletGameRouteKind): LoaderFunction {
  return async ({ params, request }) => {
    const tabletGame = await fetchTabletGame(request);
    if (tabletGame === null) {
      return null;
    }

    const target = resolveTabletGameRoute(kind, params.id, tabletGame.game);
    return target === null ? null : redirectToTabletGame(target);
  };
}
