import { useCallback, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { useQueryClient } from "@tanstack/react-query";
import type { NavigateFunction } from "react-router-dom";
import { createRoom } from "@/shared/api/room";
import { getGameSettings, startGame } from "@/shared/api/game";
import {
  $preCreateGameSettings,
  resetGameStore,
  setCurrentGameId,
  acceptGameSettings,
  setInvitation,
} from "@/shared/store";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import { ROUTES } from "@/lib/router/routes";
import { gameQueries } from "@/shared/query/game.queries";
import { playSound } from "@/shared/services/browser/soundPlayer";

type SetStartPageError = (message: string | null) => void;

interface UseCreateStartFlowParams {
  gameId: number | null;
  invitationGameId?: number | null | undefined;
  navigate: NavigateFunction;
  setPageError: SetStartPageError;
}

interface UseCreateStartFlowResult {
  creating: boolean;
  starting: boolean;
  handleCreateRoom: () => Promise<void>;
  handleStartGame: () => Promise<void>;
}

/**
 * Handles room creation and lobby-to-game start transitions.
 */
export function useCreateStartFlow({
  gameId,
  invitationGameId,
  navigate,
  setPageError,
}: UseCreateStartFlowParams): UseCreateStartFlowResult {
  const preCreateGameSettings = useStore($preCreateGameSettings);
  const client = useQueryClient();
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
      playSound("start");
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
        startScore: preCreateGameSettings.startScore,
        doubleOut: preCreateGameSettings.doubleOut,
        tripleOut: preCreateGameSettings.tripleOut,
      });

      acceptGameSettings(response.gameId, preCreateGameSettings);
      setInvitation(response);
      setCurrentGameId(response.gameId);
      // The new room is the tablet game now, so the next route reads it again.
      void client.invalidateQueries({ queryKey: gameQueries.tablet().queryKey });
      navigate(ROUTES.start(response.gameId));
    } catch (error) {
      setPageError(toUserErrorMessage(error, "Could not create a new game. Please try again."));
    } finally {
      createRoomInFlightRef.current = false;
      setCreating(false);
    }
  }, [client, creating, invitationGameId, navigate, preCreateGameSettings, setPageError]);

  return {
    creating,
    starting,
    handleCreateRoom,
    handleStartGame,
  };
}
