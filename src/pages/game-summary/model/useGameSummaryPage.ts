import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getFinishedGame, FinishedPlayerResponse, createRematch } from "@/services/api";
import { setInvitation, setLastFinishedGameId, resetRoomStore } from "@/stores";
import { playSound } from "@/shared/lib/soundPlayer";
import "@/types/BASIC.d";

export function useGameSummaryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [serverFinished, setServerFinished] = useState<FinishedPlayerResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const finishedGameIdFromRoute = (location.state as { finishedGameId?: number } | null)
    ?.finishedGameId;

  useEffect(() => {
    if (!finishedGameIdFromRoute) return;

    getFinishedGame(finishedGameIdFromRoute)
      .then((data) => {
        setServerFinished(data);
        setLastFinishedGameId(finishedGameIdFromRoute);
      })
      .catch((err: unknown) => {
        console.error("Failed to fetch finished game:", err);
        setError("Could not load finished game data");
      });
  }, [finishedGameIdFromRoute]);

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

  const handleUndo = (): void => {
    playSound("undo");
  };

  const handlePlayAgain = async (): Promise<void> => {
    sessionStorage.removeItem("OngoingGame");

    if (!finishedGameIdFromRoute) return;

    try {
      const rematch = await createRematch(finishedGameIdFromRoute);

      setInvitation({
        gameId: rematch.gameId,
        invitationLink: rematch.invitationLink,
      });

      navigate("/game");
    } catch (err) {
      console.error("Failed to start rematch:", err);
    }
  };

  const handleBackToStart = async (): Promise<void> => {
    sessionStorage.removeItem("OngoingGame");
    resetRoomStore();

    if (finishedGameIdFromRoute) {
      setLastFinishedGameId(finishedGameIdFromRoute);
    }

    navigate("/start");
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
