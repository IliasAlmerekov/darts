import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { FinishedPlayerResponse } from "@/lib/api/game";
import { useGameFlowPort } from "@/shared/providers/GameFlowPortProvider";
import { setInvitation, setLastFinishedGameId, resetRoomStore } from "@/stores";
import { playSound } from "@/lib/soundPlayer";
import { ApiError } from "@/lib/api/errors";

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

function isStartedReopenConflict(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 409) {
    return false;
  }

  const payload = error.data;
  if (null === payload || "object" !== typeof payload) {
    return false;
  }

  const typedPayload = payload as ApiErrorPayload;
  if ("GAME_REOPEN_NOT_ALLOWED" !== typedPayload.error) {
    return false;
  }

  return true;
}

/**
 * Loads summary data for a finished game and provides rematch actions.
 */
export function useGameSummaryPage() {
  const gameFlow = useGameFlowPort();
  const navigate = useNavigate();
  const location = useLocation();
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

  useEffect(() => {
    if (!finishedGameIdFromRoute) return;

    gameFlow
      .getFinishedGame(finishedGameIdFromRoute)
      .then((data) => {
        setServerFinished(data);
        setLastFinishedGameId(finishedGameIdFromRoute);
      })
      .catch((err: unknown) => {
        console.error("Failed to fetch finished game:", err);
        setError("Could not load finished game data");
      });
  }, [finishedGameIdFromRoute, gameFlow]);

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
      playSound("undo");
      const gameState = await gameFlow.undoLastThrow(finishedGameIdFromRoute);
      if ("finished" === gameState.status) {
        await gameFlow.reopenGame(finishedGameIdFromRoute);
      }

      navigate(`/game/${finishedGameIdFromRoute}`);
    } catch (err) {
      if (isStartedReopenConflict(err)) {
        navigate(`/game/${finishedGameIdFromRoute}`);
        return;
      }

      console.error("Failed to reopen game:", err);
      setError("Could not reopen game");
    }
  };

  const handlePlayAgain = async (): Promise<void> => {
    if (!finishedGameIdFromRoute) return;

    try {
      const rematch = await gameFlow.createRematch(finishedGameIdFromRoute);

      setInvitation({
        gameId: rematch.gameId,
        invitationLink: rematch.invitationLink,
      });

      navigate(`/game/${rematch.gameId}`);
    } catch (err) {
      console.error("Failed to start rematch:", err);
    }
  };

  const handleBackToStart = async (): Promise<void> => {
    resetRoomStore();
    if (!finishedGameIdFromRoute) return;
    if (finishedGameIdFromRoute) {
      setLastFinishedGameId(finishedGameIdFromRoute);
    }

    try {
      const rematch = await gameFlow.createRematch(finishedGameIdFromRoute);

      setInvitation({
        gameId: rematch.gameId,
        invitationLink: rematch.invitationLink,
      });

      navigate(`/start/${rematch.gameId}`);
    } catch (err) {
      console.error("Failed to start rematch:", err);
    }
  };

  return {
    error,
    podiumData,
    newList,
    leaderBoardList,
    handleUndo,
    handlePlayAgain,
    handleBackToStart,
  };
}
