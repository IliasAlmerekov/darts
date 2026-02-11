import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { FinishedPlayerResponse } from "@/lib/api/game";
import { useGameFlowPort } from "@/shared/providers/GameFlowPortProvider";

type UseGameDetailPageResult = {
  error: string | null;
  podiumData: BASIC.WinnerPlayerProps[];
  newList: BASIC.WinnerPlayerProps[];
  leaderBoardList: BASIC.WinnerPlayerProps[];
};

/**
 * Loads finished game details by route id and builds data for podium/leaderboard.
 */
export function useGameDetailPage(): UseGameDetailPageResult {
  const gameFlow = useGameFlowPort();
  const { id: gameIdParam } = useParams<{ id?: string }>();
  const [serverFinished, setServerFinished] = useState<FinishedPlayerResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const finishedGameIdFromRoute = useMemo(() => {
    if (!gameIdParam) {
      return null;
    }

    const parsedParam = Number(gameIdParam);
    return Number.isFinite(parsedParam) ? parsedParam : null;
  }, [gameIdParam]);

  useEffect(() => {
    if (!finishedGameIdFromRoute) {
      setError("Invalid game id");
      return;
    }

    gameFlow
      .getFinishedGame(finishedGameIdFromRoute)
      .then((data) => {
        setServerFinished(data);
        setError(null);
      })
      .catch((err: unknown) => {
        console.error("Failed to fetch finished game details:", err);
        setError("Could not load finished game data");
      });
  }, [finishedGameIdFromRoute, gameFlow]);

  const newList: BASIC.WinnerPlayerProps[] = useMemo(() => {
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
  }, [serverFinished]);

  const podiumList = newList.slice(0, 3);
  const leaderBoardList = newList.slice(3, newList.length);
  const podiumListWithPlaceholder = [...podiumList];

  if (podiumList.length === 2) {
    podiumListWithPlaceholder.push({
      id: 0,
      name: "-",
      score: 0,
      isActive: false,
      index: 0,
      rounds: [{ throw1: undefined, throw2: undefined, throw3: undefined }],
    });
  }

  const podiumData = podiumList.length === 2 ? podiumListWithPlaceholder : podiumList;

  return {
    error,
    podiumData,
    newList,
    leaderBoardList,
  };
}
