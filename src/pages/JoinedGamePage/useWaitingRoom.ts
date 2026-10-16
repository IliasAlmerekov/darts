import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { playerQueries } from "@/shared/query/player.queries";
import { toWaitingRoomView, type WaitingRoomView } from "./lib/waitingRoomView";

const FAILURES_BEFORE_CONNECTION_LOST = 3;

interface UseWaitingRoomReturn {
  view: WaitingRoomView;
  isConnectionLost: boolean;
}

/** The error count at the last successful answer; later errors are failures in a row. */
interface FailureBaseline {
  dataUpdatedAt: number;
  errorUpdateCount: number;
}

/**
 * Polls the player's current game and tells the Waiting room what to show.
 */
export function useWaitingRoom(): UseWaitingRoomReturn {
  const { data, dataUpdatedAt, errorUpdateCount } = useQuery(playerQueries.currentGame());
  const [hasSeenGame, setHasSeenGame] = useState(false);
  const [failureBaseline, setFailureBaseline] = useState<FailureBaseline>({
    dataUpdatedAt,
    errorUpdateCount,
  });

  // Both updates run during render, so the screen never shows a stale value first.
  if (!hasSeenGame && typeof data?.gameId === "number") {
    setHasSeenGame(true);
  }
  if (dataUpdatedAt !== failureBaseline.dataUpdatedAt) {
    setFailureBaseline({ dataUpdatedAt, errorUpdateCount });
  }

  const failuresInARow = errorUpdateCount - failureBaseline.errorUpdateCount;

  return {
    view: toWaitingRoomView(data, hasSeenGame),
    isConnectionLost: failuresInARow >= FAILURES_BEFORE_CONNECTION_LOST,
  };
}
