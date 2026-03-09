import { useEffect, useRef } from "react";
import { finishGame, resetGameStateVersion } from "@/shared/api/game";
import { toUserErrorMessage } from "@/lib/error-to-user-message";
import { ROUTES } from "@/lib/routes";
import { unlockSounds } from "@/lib/soundPlayer";
import type { GameThrowsResponse } from "@/types";
import { shouldAutoFinishGame, shouldNavigateToSummary } from "./gameLogic.helpers";

interface UseGameSummaryNavigationOptions {
  gameData: GameThrowsResponse | null;
  gameId: number | null;
  navigate: (to: string, options?: { state?: { finishedGameId: number } }) => void;
}

interface UseRoomEventRefetchOptions {
  event: { type: string } | null;
  refetch: () => Promise<void>;
}

interface UseAutoFinishGameOptions {
  gameData: GameThrowsResponse | null;
  gameId: number | null;
  refetch: () => Promise<void>;
  setPageError: (message: string | null) => void;
  shouldShowFinishOverlay: boolean;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function useInteractionSoundUnlock(): void {
  useEffect(() => {
    const handleInteraction = () => {
      unlockSounds();
    };

    window.addEventListener("pointerdown", handleInteraction, { once: true, passive: true });
    window.addEventListener("keydown", handleInteraction, { once: true });

    return () => {
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, []);
}

export function useGameSummaryNavigation({
  gameData,
  gameId,
  navigate,
}: UseGameSummaryNavigationOptions): void {
  useEffect(() => {
    if (gameId !== null && shouldNavigateToSummary(gameData, gameId)) {
      navigate(ROUTES.summary(gameId), { state: { finishedGameId: gameId } });
    }
  }, [gameData, gameId, navigate]);
}

export function useRoomEventRefetch({ event, refetch }: UseRoomEventRefetchOptions): void {
  useEffect(() => {
    if (!event) {
      return;
    }

    if (event.type === "game-started" || event.type === "game-finished") {
      void refetch();
    }
  }, [event, refetch]);
}

export function useAutoFinishGame({
  gameData,
  gameId,
  refetch,
  setPageError,
  shouldShowFinishOverlay,
}: UseAutoFinishGameOptions): void {
  const isAutoFinishingRef = useRef(false);

  useEffect(() => {
    if (!gameId || !shouldAutoFinishGame(gameData, shouldShowFinishOverlay)) {
      return;
    }

    if (isAutoFinishingRef.current) {
      return;
    }

    isAutoFinishingRef.current = true;
    const controller = new AbortController();
    const { signal } = controller;

    finishGame(gameId, signal)
      .then(() => {
        if (signal.aborted) {
          return;
        }

        resetGameStateVersion(gameId);
        void refetch();
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || signal.aborted) {
          return;
        }

        console.error("Failed to auto-finish game:", error);
        setPageError(toUserErrorMessage(error, "Could not finish the game automatically."));
      })
      .finally(() => {
        isAutoFinishingRef.current = false;
      });

    return () => {
      controller.abort();
      isAutoFinishingRef.current = false;
    };
  }, [gameData, gameId, refetch, setPageError, shouldShowFinishOverlay]);
}
