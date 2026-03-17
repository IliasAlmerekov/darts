import { useCallback, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import type { NavigateFunction } from "react-router-dom";
import { createRoom } from "@/shared/api/room";
import { getGameSettings, startGame } from "@/shared/api/game";
import {
  $preCreateGameSettings,
  resetGameStore,
  setCurrentGameId,
  setGameSettings,
  setInvitation,
} from "@/shared/store";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import { ROUTES } from "@/lib/router/routes";
import type { SetStartPageError } from "./useStartPageError";

const START_SOUND_PATH = "/sounds/start-round-sound.mp3";

interface UseCreateStartFlowParams {
  gameId: number | null;
  invitationGameId?: number | null | undefined;
  lastFinishedGameId: number | null;
  navigate: NavigateFunction;
  setPageError: SetStartPageError;
}

export interface UseCreateStartFlowResult {
  creating: boolean;
  starting: boolean;
  handleCreateRoom: () => Promise<void>;
  handleStartGame: () => Promise<void>;
}

function playStartSound(): void {
  const audio = new Audio(START_SOUND_PATH);
  audio.volume = 0.4;
  try {
    void audio.play().catch(() => undefined);
  } catch {
    // Audio playback is best-effort and may be unavailable in tests or blocked browsers.
  }
}

/**
 * Handles room creation and lobby-to-game start transitions.
 */
export function useCreateStartFlow({
  gameId,
  invitationGameId,
  lastFinishedGameId,
  navigate,
  setPageError,
}: UseCreateStartFlowParams): UseCreateStartFlowResult {
  const preCreateGameSettings = useStore($preCreateGameSettings);
  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState(false);
  const createRoomInFlightRef = useRef(false);
  const startGameInFlightRef = useRef(false);

  const handleStartGame = useCallback(async (): Promise<void> => {
    if (gameId === null || starting || startGameInFlightRef.current) {
      return;
    }

    startGameInFlightRef.current = true;
    setStarting(true);
    setPageError(null);

    try {
      playStartSound();
      const settings = await getGameSettings(gameId);

      await startGame(gameId, {
        startScore: settings.startScore,
        doubleOut: settings.doubleOut,
        tripleOut: settings.tripleOut,
        round: 1,
        status: "started",
      });

      resetGameStore();
      navigate(ROUTES.game(gameId));
    } catch (error) {
      setPageError(toUserErrorMessage(error, "Could not start game. Please try again."));
    } finally {
      startGameInFlightRef.current = false;
      setStarting(false);
    }
  }, [gameId, navigate, setPageError, starting]);

  const handleCreateRoom = useCallback(async (): Promise<void> => {
    if (creating || createRoomInFlightRef.current || invitationGameId) {
      return;
    }

    createRoomInFlightRef.current = true;
    setCreating(true);
    setPageError(null);

    try {
      const response = await createRoom({
        previousGameId: lastFinishedGameId ?? undefined,
        startScore: preCreateGameSettings.startScore,
        doubleOut: preCreateGameSettings.doubleOut,
        tripleOut: preCreateGameSettings.tripleOut,
      });

      setGameSettings(preCreateGameSettings, response.gameId);
      setInvitation(response);
      setCurrentGameId(response.gameId);
      navigate(ROUTES.start(response.gameId));
    } catch (error) {
      setPageError(toUserErrorMessage(error, "Could not create a new game. Please try again."));
    } finally {
      createRoomInFlightRef.current = false;
      setCreating(false);
    }
  }, [
    creating,
    invitationGameId,
    lastFinishedGameId,
    navigate,
    preCreateGameSettings,
    setPageError,
  ]);

  return {
    creating,
    starting,
    handleCreateRoom,
    handleStartGame,
  };
}
