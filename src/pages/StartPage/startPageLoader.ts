import type { LoaderFunctionArgs } from "react-router-dom";
import { replace } from "react-router-dom";
import { getGameThrows } from "@/shared/api/game";
import { getInvitation } from "@/shared/api/room";
import { toLobbyPlayers } from "@/lib/game/lobbyPlayers";
import { ROUTES } from "@/lib/router/routes";
import { resolveTabletGameRoute, routeGameIdOrNotFound } from "@/lib/router/tabletGameRoute";
import { gameQueries } from "@/shared/query/game.queries";
import { queryClient } from "@/shared/query/queryClient";
import { fetchTabletGame, redirectToTabletGame } from "@/shared/query/tabletGameLoader";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { $invitation, setGameData, setInvitation, setServerCurrentGameId } from "@/shared/store";

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/**
 * React Router loader for the StartPage route.
 * An invalid game id throws a 404 route error response before any read.
 * Follows the tablet game, then fetches its game throws and invitation before the page
 * renders, populates the game-session stores, and fills the lobby players query.
 * Register as: loader={startPageLoader}
 */
export async function startPageLoader({
  params,
  request,
}: LoaderFunctionArgs): Promise<Response | null> {
  const gameId = routeGameIdOrNotFound(params.id);
  const tabletGame = await fetchTabletGame(request);
  if (tabletGame === null) {
    return null;
  }

  // The room store may still hold the invitation of a game that has finished since.
  setServerCurrentGameId(tabletGame.game?.id ?? null);

  const target = resolveTabletGameRoute("start", gameId, tabletGame.game);
  if (target !== null) {
    return redirectToTabletGame(target);
  }

  if (gameId === null) {
    return null;
  }

  if ($invitation.get()?.gameId === gameId) {
    // The SSE stream was closed while the page was away, so a list cached on an earlier visit
    // may miss players. Without it the page starts from the game store and reads once.
    queryClient.removeQueries({ queryKey: gameQueries.lobbyPlayers(gameId).queryKey });
    return null;
  }

  let gameData;
  try {
    gameData = await getGameThrows(gameId, request.signal);
  } catch (error) {
    if (isAbortError(error)) throw error;
    clientLogger.error("room.restore.failed", { context: { gameId }, error });
    return null;
  }

  // The game left the lobby between the two reads.
  if (gameData.status === "started") {
    return replace(ROUTES.game(gameId));
  }
  if (gameData.status !== "lobby") {
    clientLogger.warn("room.restore.access_denied", {
      context: { gameId, status: gameData.status },
    });
    return null;
  }

  setGameData(gameData);
  queryClient.setQueryData(
    gameQueries.lobbyPlayers(gameId).queryKey,
    toLobbyPlayers(gameData.players),
  );

  try {
    const invitationData = await getInvitation(gameId, request.signal);
    setInvitation({
      gameId: invitationData.gameId,
      invitationLink: invitationData.invitationLink,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    clientLogger.warn("room.restore.invitation_load_failed", { error });
  }

  return null;
}
