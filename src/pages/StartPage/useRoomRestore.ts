import { useEffect, useMemo, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { getGameThrows } from "@/shared/api/game";
import { getInvitation } from "@/shared/api/room";
import { clientLogger } from "@/shared/lib/clientLogger";
import { setCurrentGameId, setGameData, setInvitation } from "@/store";
import { ROUTES } from "@/lib/routes";

type UseRoomRestoreParams = {
  gameIdParam: string | undefined;
  gameId: number | null;
  invitationGameId?: number | null | undefined;
  currentGameId: number | null;
  navigate: NavigateFunction;
};

export type UseRoomRestoreResult = {
  isRestoring: boolean;
};

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
  return !gameIdParam && !invitationGameId && typeof currentGameId === "number";
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function navigateToActiveStart(navigate: NavigateFunction, currentGameId: number | null): void {
  if (currentGameId) {
    navigate(ROUTES.start(currentGameId), { replace: true });
    return;
  }

  navigate(ROUTES.start(), { replace: true });
}

/**
 * Restores lobby state from the route game id and synchronizes invitation/session stores.
 */
export function useRoomRestore({
  gameIdParam,
  gameId,
  invitationGameId,
  currentGameId,
  navigate,
}: UseRoomRestoreParams): UseRoomRestoreResult {
  const [isRestoring, setIsRestoring] = useState(false);

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
    if (!gameId || invitationGameId === gameId) {
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const restoreData = async (): Promise<void> => {
      setIsRestoring(true);

      try {
        if (signal.aborted) {
          return;
        }

        if (currentGameId && currentGameId !== gameId) {
          console.warn(`Redirecting from game ${gameId} to active game ${currentGameId}`);
          navigate(ROUTES.start(currentGameId), { replace: true });
          return;
        }

        if (currentGameId === null) {
          console.warn(`No active game, redirecting from game ${gameId} to /start`);
          setInvitation(null);
          navigate(ROUTES.start(), { replace: true });
          return;
        }

        const gameData = await getGameThrows(gameId, signal);
        if (signal.aborted) {
          return;
        }

        if (gameData.status !== "lobby") {
          console.warn(`Access to game ${gameId} denied - status: ${gameData.status}`);
          navigateToActiveStart(navigate, currentGameId);
          return;
        }

        setGameData(gameData);

        try {
          const invitation = await getInvitation(gameId, signal);
          if (signal.aborted) {
            return;
          }

          setInvitation({
            gameId: invitation.gameId,
            invitationLink: invitation.invitationLink,
          });
          setCurrentGameId(invitation.gameId);
        } catch (error) {
          if (isAbortError(error) || signal.aborted) {
            return;
          }

          console.warn("Could not load invitation link:", error);
          setCurrentGameId(gameId);
        }
      } catch (error) {
        if (isAbortError(error) || signal.aborted) {
          return;
        }

        clientLogger.error("room.restore.failed", {
          context: { currentGameId, gameId, invitationGameId },
          error,
        });
        navigateToActiveStart(navigate, currentGameId);
      } finally {
        if (!signal.aborted) {
          setIsRestoring(false);
        }
      }
    };

    void restoreData();

    return () => {
      controller.abort();
    };
  }, [currentGameId, gameId, invitationGameId, navigate]);

  useEffect(() => {
    if (invitationGameId) {
      setCurrentGameId(invitationGameId);
    }
  }, [invitationGameId]);

  return {
    isRestoring,
  };
}
