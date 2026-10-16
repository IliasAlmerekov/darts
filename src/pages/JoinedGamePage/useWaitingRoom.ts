import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CurrentGameResponse } from "@/shared/api/player";
import { playerQueries } from "@/shared/query/player.queries";

const FAILURES_BEFORE_CONNECTION_LOST = 3;

export type WaitingRoomStatus =
  | { kind: "loading" }
  | { kind: "waiting"; gameId: number }
  | { kind: "started"; gameId: number }
  | { kind: "removed" }
  | { kind: "no-game" };

interface UseWaitingRoomReturn {
  status: WaitingRoomStatus;
  isConnectionLost: boolean;
}

interface LastSuccess {
  dataUpdatedAt: number;
  errorUpdateCount: number;
}

/**
 * Polls the player's current game and tells the Waiting room what to show.
 */
export function useWaitingRoom(): UseWaitingRoomReturn {
  const { data, dataUpdatedAt, errorUpdateCount } = useQuery(playerQueries.currentGame());
  const [hasSeenGame, setHasSeenGame] = useState(false);
  const [lastSuccess, setLastSuccess] = useState<LastSuccess>({ dataUpdatedAt, errorUpdateCount });

  // Both updates run during render, so the screen never shows a stale value first.
  if (!hasSeenGame && typeof data?.gameId === "number") {
    setHasSeenGame(true);
  }
  if (dataUpdatedAt !== lastSuccess.dataUpdatedAt) {
    setLastSuccess({ dataUpdatedAt, errorUpdateCount });
  }

  const failuresInARow = errorUpdateCount - lastSuccess.errorUpdateCount;

  return {
    status: toWaitingRoomStatus(data, hasSeenGame),
    isConnectionLost: failuresInARow >= FAILURES_BEFORE_CONNECTION_LOST,
  };
}

function toWaitingRoomStatus(
  currentGame: CurrentGameResponse | undefined,
  hasSeenGame: boolean,
): WaitingRoomStatus {
  if (currentGame === undefined) {
    return { kind: "loading" };
  }
  if (currentGame.gameId === null) {
    return hasSeenGame ? { kind: "removed" } : { kind: "no-game" };
  }
  return currentGame.status === "started"
    ? { kind: "started", gameId: currentGame.gameId }
    : { kind: "waiting", gameId: currentGame.gameId };
}
