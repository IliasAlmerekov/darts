import { useEffect, useMemo } from "react";
import type { LoaderFunctionArgs, NavigateFunction } from "react-router-dom";
import { redirect } from "react-router-dom";
import { getGameThrows } from "@/shared/api/game";
import { getInvitation } from "@/shared/api/room";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import {
  $currentGameId,
  $invitation,
  setCurrentGameId,
  setGameData,
  setInvitation,
} from "@/shared/store";
import { ROUTES } from "@/shared/lib/router/routes";

interface UseRoomRestoreParams {
  gameIdParam: string | undefined;
  invitationGameId?: number | null | undefined;
  currentGameId: number | null;
  navigate: NavigateFunction;
}

/**
 * Parses the raw URL route param into a valid game ID.
 * Returns null for anything that is not a positive integer string.
 * Invitation and session-storage values are intentionally NOT consulted -
 * the route param is the single authoritative source for the active game.
 */
export function resolveGameId(gameIdParam: string | undefined): number | null {
  if (!gameIdParam) {
    return null;
  }

  const parsed = Number(gameIdParam);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function shouldRedirectToCurrentGame(
  gameIdParam?: string,
  invitationGameId?: number | null,
  currentGameId?: number | null,
): boolean {
  return (
    !gameIdParam &&
    (invitationGameId === null || invitationGameId === undefined) &&
    typeof currentGameId === "number"
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/**
 * React Router 6 loader for the StartPage route.
 * Fetches game throws and invitation data before the page renders,
 * and populates the game-session stores.
 * Register as: loader={startPageLoader}
 */
export async function startPageLoader({
  params,
  request,
}: LoaderFunctionArgs): Promise<Response | null> {
  const gameId = resolveGameId(params.id);

  if (gameId === null) {
    return null;
  }

  const currentGameId = $currentGameId.get();
  const invitation = $invitation.get();

  if (invitation?.gameId === gameId) {
    return null;
  }

  if (currentGameId !== null && currentGameId !== gameId) {
    clientLogger.warn("room.restore.redirect_to_active", {
      context: { fromGameId: gameId, toGameId: currentGameId },
    });
    return redirect(ROUTES.start(currentGameId));
  }

  if (currentGameId === null) {
    clientLogger.warn("room.restore.no_active_game", { context: { gameId } });
    setInvitation(null);
    return redirect(ROUTES.start());
  }

  let gameData;
  try {
    gameData = await getGameThrows(gameId, request.signal);
  } catch (error) {
    if (isAbortError(error)) throw error;
    clientLogger.error("room.restore.failed", {
      context: { currentGameId, gameId },
      error,
    });
    return redirect(ROUTES.start(currentGameId));
  }

  if (gameData.status !== "lobby") {
    clientLogger.warn("room.restore.access_denied", {
      context: { gameId, status: gameData.status },
    });
    return redirect(ROUTES.start(currentGameId));
  }

  setGameData(gameData);

  try {
    const invitationData = await getInvitation(gameId, request.signal);
    setInvitation({
      gameId: invitationData.gameId,
      invitationLink: invitationData.invitationLink,
    });
    setCurrentGameId(invitationData.gameId);
  } catch (error) {
    if (isAbortError(error)) throw error;
    clientLogger.warn("room.restore.invitation_load_failed", { error });
    setCurrentGameId(gameId);
  }

  return null;
}

/**
 * Handles client-side redirect logic for StartPage lobby.
 * Data fetching is handled by startPageLoader.
 */
export function useRoomRestore({
  gameIdParam,
  invitationGameId,
  currentGameId,
  navigate,
}: UseRoomRestoreParams): void {
  const shouldRedirect = useMemo(
    () => shouldRedirectToCurrentGame(gameIdParam, invitationGameId, currentGameId),
    [currentGameId, gameIdParam, invitationGameId],
  );

  useEffect(() => {
    if (!shouldRedirect) {
      return;
    }

    navigate(ROUTES.start(currentGameId ?? undefined), { replace: true });
  }, [currentGameId, navigate, shouldRedirect]);

  useEffect(() => {
    if (invitationGameId !== undefined && invitationGameId !== null) {
      setCurrentGameId(invitationGameId);
    }
  }, [invitationGameId]);
}
