import { useEffect, useRef } from "react";
import { finishGame, resetGameStateVersion } from "@/shared/api/game";
import { toUserErrorMessage } from "@/lib/error-to-user-message";
import { ROUTES } from "@/lib/routes";
import { unlockSounds } from "@/lib/soundPlayer";
import { setLastFinishedGameSummary } from "@/shared/store";
import { clientLogger } from "@/shared/lib/clientLogger";
import type { GameSummaryResponse, GameThrowsResponse, RoomStreamEventType } from "@/types";
import { shouldAutoFinishGame, shouldNavigateToSummary } from "./gameLogic.helpers";

interface GameSummaryNavigationState {
  finishedGameId: number;
  summary?: GameSummaryResponse;
}

interface UseGameSummaryNavigationOptions {
  gameData: GameThrowsResponse | null;
  gameId: number | null;
  navigate: (to: string, options?: { state?: GameSummaryNavigationState }) => void;
}

interface UseRoomEventRefetchOptions {
  event: { type: RoomStreamEventType } | null;
  refetch: () => Promise<void>;
}

const GAME_STARTED_EVENT_TYPE: RoomStreamEventType = "game-started";
const GAME_FINISHED_EVENT_TYPE: RoomStreamEventType = "game-finished";

interface UseAutoFinishGameOptions {
  gameData: GameThrowsResponse | null;
  gameId: number | null;
  navigate: (to: string, options?: { state?: GameSummaryNavigationState }) => void;
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

    if (event.type === GAME_STARTED_EVENT_TYPE || event.type === GAME_FINISHED_EVENT_TYPE) {
      void refetch();
    }
  }, [event, refetch]);
}

export function useAutoFinishGame({
  gameData,
  gameId,
  navigate,
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
      .then((summary) => {
        if (signal.aborted) {
          return;
        }

        resetGameStateVersion(gameId);
        setLastFinishedGameSummary({ gameId, summary });
        navigate(ROUTES.summary(gameId), {
          state: { finishedGameId: gameId, summary },
        });
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || signal.aborted) {
          return;
        }

        clientLogger.error("game.auto-finish.failed", {
          context: { gameId },
          error,
        });
        setPageError(toUserErrorMessage(error, "Could not finish the game automatically."));
      })
      .finally(() => {
        isAutoFinishingRef.current = false;
      });

    return () => {
      controller.abort();
      isAutoFinishingRef.current = false;
    };
  }, [gameData, gameId, navigate, setPageError, shouldShowFinishOverlay]);
}
