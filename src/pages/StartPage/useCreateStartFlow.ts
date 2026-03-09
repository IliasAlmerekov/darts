import { useCallback, useRef, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { createRoom } from "@/shared/api/room";
import { startGame } from "@/shared/api/game";
import { setCurrentGameId, setInvitation } from "@/store";
import { toUserErrorMessage } from "@/lib/error-to-user-message";
import { ROUTES } from "@/lib/routes";
import type { SetStartPageError } from "./useStartPageError";

const START_SOUND_PATH = "/sounds/start-round-sound.mp3";

type GameSettingsSnapshot = {
  startScore: number;
  doubleOut: boolean;
  tripleOut: boolean;
} | null;

type UseCreateStartFlowParams = {
  gameId: number | null;
  invitationGameId?: number | null | undefined;
  lastFinishedGameId: number | null;
  gameSettings: GameSettingsSnapshot;
  navigate: NavigateFunction;
  setPageError: SetStartPageError;
};

export type UseCreateStartFlowResult = {
  creating: boolean;
  starting: boolean;
  handleCreateRoom: () => Promise<void>;
  handleStartGame: () => Promise<void>;
};

function playStartSound(): void {
  const audio = new Audio(START_SOUND_PATH);
  audio.volume = 0.4;
  void audio.play().catch(() => undefined);
}

/**
 * Handles room creation and lobby-to-game start transitions.
 */
export function useCreateStartFlow({
  gameId,
  invitationGameId,
  lastFinishedGameId,
  gameSettings,
  navigate,
  setPageError,
}: UseCreateStartFlowParams): UseCreateStartFlowResult {
  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState(false);
  const createRoomInFlightRef = useRef(false);
  const startGameInFlightRef = useRef(false);

  const startScore = gameSettings?.startScore ?? 301;
  const isDoubleOut = gameSettings?.doubleOut ?? false;
  const isTripleOut = gameSettings?.tripleOut ?? false;

  const handleStartGame = useCallback(async (): Promise<void> => {
    if (!gameId || starting || startGameInFlightRef.current) {
      return;
    }

    startGameInFlightRef.current = true;
    setStarting(true);
    setPageError(null);

    try {
      playStartSound();

      await startGame(gameId, {
        startScore,
        doubleOut: isDoubleOut,
        tripleOut: isTripleOut,
        round: 1,
        status: "started",
      });

      navigate(ROUTES.game(gameId));
    } catch (error) {
      setPageError(toUserErrorMessage(error, "Could not start game. Please try again."));
    } finally {
      startGameInFlightRef.current = false;
      setStarting(false);
    }
  }, [gameId, isDoubleOut, isTripleOut, navigate, setPageError, startScore, starting]);

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
      });

      setInvitation(response);
      setCurrentGameId(response.gameId);
      navigate(ROUTES.start(response.gameId));
    } catch (error) {
      setPageError(toUserErrorMessage(error, "Could not create a new game. Please try again."));
    } finally {
      createRoomInFlightRef.current = false;
      setCreating(false);
    }
  }, [creating, invitationGameId, lastFinishedGameId, navigate, setPageError]);

  return {
    creating,
    starting,
    handleCreateRoom,
    handleStartGame,
  };
}
