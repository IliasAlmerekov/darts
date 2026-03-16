import { useMemo } from "react";
import { LoaderFunctionArgs, useLoaderData } from "react-router-dom";
import { getFinishedGame } from "@/shared/api/game";
import { clientLogger } from "@/lib/clientLogger";
import type { FinishedPlayerResponse, WinnerPlayerProps } from "@/types";

type UseGameDetailPageResult = {
  podiumData: WinnerPlayerProps[];
  newList: WinnerPlayerProps[];
  leaderBoardList: WinnerPlayerProps[];
};

type GameDetailLoaderData = FinishedPlayerResponse[];

function isGameDetailLoaderData(value: unknown): value is GameDetailLoaderData {
  return Array.isArray(value);
}

function createEmptyRound(): WinnerPlayerProps["rounds"][number] {
  return {};
}

/**
 * React Router 6 loader
 * Registers the route: loader: gameDetailLoader
 */
export async function gameDetailLoader({
  params,
}: LoaderFunctionArgs): Promise<GameDetailLoaderData> {
  const parseId = Number(params.id);

  if (!Number.isFinite(parseId) || parseId <= 0) {
    throw new Response("Invalid game id", { status: 400 });
  }

  return getFinishedGame(parseId);
}

/**
 * Loads finished game details by route id and builds data for podium/leaderboard.
 */
export function useGameDetailPage(): UseGameDetailPageResult {
  const rawLoaderData = useLoaderData();

  if (!isGameDetailLoaderData(rawLoaderData)) {
    throw new Error("Unexpected loader data format for GameDetailPage");
  }

  const serverFinished: GameDetailLoaderData = rawLoaderData;

  const MIN_ROUNDS_PLAYED = 1;

  const newList: WinnerPlayerProps[] = useMemo(() => {
    return serverFinished.map((player) => {
      if (player.roundsPlayed === null) {
        clientLogger.error("game-detail.player.rounds-played.missing", {
          context: { playerId: player.playerId },
          error: new Error("roundsPlayed absent in finished game response"),
        });
      }

      const roundsPlayed = Math.max(player.roundsPlayed ?? MIN_ROUNDS_PLAYED, MIN_ROUNDS_PLAYED);

      return {
        id: player.playerId,
        name: player.username,
        score: 0,
        isActive: false,
        index: player.position - 1,
        rounds: Array.from({ length: roundsPlayed }, () => createEmptyRound()),
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
      rounds: [createEmptyRound()],
    });
  }

  const podiumData = podiumList.length === 2 ? podiumListWithPlaceholder : podiumList;

  return {
    podiumData,
    newList,
    leaderBoardList,
  };
}
