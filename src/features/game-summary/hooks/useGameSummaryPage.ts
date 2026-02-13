import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useStore } from "@nanostores/react";
import type { FinishedPlayerResponse } from "@/lib/api/game";
import { useGameFlowPort } from "@/shared/providers/GameFlowPortProvider";
import {
  $gameSettings,
  setGameData,
  setInvitation,
  setLastFinishedGameId,
  resetRoomStore,
} from "@/stores";
import { playSound } from "@/lib/soundPlayer";
import { toUserErrorMessage } from "@/lib/error-to-user-message";

/**
 * Loads summary data for a finished game and provides rematch actions.
 */
export function useGameSummaryPage() {
  const gameFlow = useGameFlowPort();
  const navigate = useNavigate();
  const location = useLocation();
  const gameSettings = useStore($gameSettings);
  const { id: summaryGameIdParam } = useParams<{ id?: string }>();
  const [serverFinished, setServerFinished] = useState<FinishedPlayerResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const finishedGameIdFromRoute = useMemo(() => {
    const stateGameId = (location.state as { finishedGameId?: number } | null)?.finishedGameId;
    if ("number" === typeof stateGameId) {
      return stateGameId;
    }

    if (!summaryGameIdParam) {
      return null;
    }

    const parsedParam = Number(summaryGameIdParam);
    return Number.isFinite(parsedParam) ? parsedParam : null;
  }, [location.state, summaryGameIdParam]);

  const loadSummary = useCallback(async (): Promise<void> => {
    if (!finishedGameIdFromRoute) return;

    try {
      setError(null);
      const data = await gameFlow.getFinishedGame(finishedGameIdFromRoute);
      setServerFinished(data);
      setLastFinishedGameId(finishedGameIdFromRoute);
    } catch (err: unknown) {
      console.error("Failed to fetch finished game:", err);
      setError(toUserErrorMessage(err, "Could not load finished game data."));
    }
  }, [finishedGameIdFromRoute, gameFlow]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const newList: BASIC.WinnerPlayerProps[] = useMemo(() => {
    if (serverFinished.length > 0) {
      return serverFinished.map((player) => {
        const roundsPlayed = Math.max(player.roundsPlayed ?? 0, 1);
        return {
          id: player.playerId,
          name: player.username,
          score: 0,
          isActive: false,
          index: player.position - 1,
          rounds: Array.from({ length: roundsPlayed }).map(() => ({
            throw1: undefined,
            throw2: undefined,
            throw3: undefined,
          })),
          scoreAverage: player.roundAverage,
          roundCount: player.roundsPlayed,
        };
      });
    }
    return [];
  }, [serverFinished]);

  const podiumList = newList.slice(0, 3);
  const leaderBoardList = newList.slice(3, newList.length);
  const podiumListWithPlaceholder = [...podiumList];
  podiumListWithPlaceholder.push({
    id: 0,
    name: "-",
    score: 0,
    isActive: false,
    index: 0,
    rounds: [{ throw1: undefined, throw2: undefined, throw3: undefined }],
  });
  const podiumData = podiumList.length === 2 ? podiumListWithPlaceholder : podiumList;

  const handleUndo = async (): Promise<void> => {
    if (!finishedGameIdFromRoute) return;

    try {
      setError(null);
      const updatedGameState = await gameFlow.undoLastThrow(finishedGameIdFromRoute);
      setGameData(updatedGameState);

      playSound("undo");
      navigate(`/game/${finishedGameIdFromRoute}`, {
        state: { skipFinishOverlay: true },
      });
    } catch (err) {
      console.error("Failed to reopen game and undo throw:", err);
      setError(toUserErrorMessage(err, "Could not reopen game and undo throw."));
    }
  };

  const handlePlayAgain = async (): Promise<void> => {
    if (!finishedGameIdFromRoute) return;

    try {
      setError(null);
      const rematch = await gameFlow.createRematch(finishedGameIdFromRoute);
      if (!rematch?.gameId) {
        throw new Error("Invalid rematch response: missing game id");
      }

      setInvitation({
        gameId: rematch.gameId,
        invitationLink: rematch.invitationLink,
      });

      const startScore = gameSettings?.startScore ?? 301;
      const doubleOut = gameSettings?.doubleOut ?? false;
      const tripleOut = gameSettings?.tripleOut ?? false;

      // Navigate immediately for fast UX; start call continues in background.
      navigate(`/game/${rematch.gameId}`);

      void gameFlow
        .startGame(rematch.gameId, {
          startScore,
          doubleOut,
          tripleOut,
          round: 1,
          status: "started",
        })
        .catch((startError) => {
          console.error("Failed to start rematch game:", startError);
          setError(toUserErrorMessage(startError, "Could not start a rematch."));
        });
    } catch (err) {
      console.error("Failed to start rematch:", err);
      setError(toUserErrorMessage(err, "Could not start a rematch."));
    }
  };

  const handleBackToStart = async (): Promise<void> => {
    resetRoomStore();
    if (!finishedGameIdFromRoute) return;
    if (finishedGameIdFromRoute) {
      setLastFinishedGameId(finishedGameIdFromRoute);
    }

    try {
      setError(null);
      const rematch = await gameFlow.createRematch(finishedGameIdFromRoute);

      setInvitation({
        gameId: rematch.gameId,
        invitationLink: rematch.invitationLink,
      });

      navigate(`/start/${rematch.gameId}`);
    } catch (err) {
      console.error("Failed to start rematch:", err);
      setError(toUserErrorMessage(err, "Could not return to start."));
    }
  };

  return {
    error,
    podiumData,
    newList,
    leaderBoardList,
    loadSummary,
    handleUndo,
    handlePlayAgain,
    handleBackToStart,
  };
}
