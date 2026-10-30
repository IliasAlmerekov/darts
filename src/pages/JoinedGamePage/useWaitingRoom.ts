import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { playerQueries } from "@/shared/query/player.queries";
import { $currentGameId } from "@/shared/store";
import type { WaitingRoomView } from "./lib/waitingRoomView";

const FAILURES_BEFORE_CONNECTION_LOST = 3;

interface UseWaitingRoomResult {
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
export function useWaitingRoom(): UseWaitingRoomResult {
  const { data, dataUpdatedAt, errorUpdateCount } = useQuery(playerQueries.currentGame());
  // The stored game id outlives this page, so a player removed while on the profile page or
  // during a reload still learns why. The first answer of "none" clears it.
  const [hasSeenGame, setHasSeenGame] = useState(() => $currentGameId.get() !== null);
  const [failureBaseline, setFailureBaseline] = useState<FailureBaseline>({
    dataUpdatedAt,
    errorUpdateCount,
  });

  // Both updates run during render, so the screen never shows a stale value first.
  if (!hasSeenGame && data !== undefined && data.kind !== "none") {
    setHasSeenGame(true);
  }
  if (dataUpdatedAt !== failureBaseline.dataUpdatedAt) {
    setFailureBaseline({ dataUpdatedAt, errorUpdateCount });
  }

  const failuresInARow = errorUpdateCount - failureBaseline.errorUpdateCount;
  let view: WaitingRoomView;
  if (data === undefined) {
    view = { kind: "loading" };
  } else if (data.kind === "none") {
    view = { kind: hasSeenGame ? "removed" : "no-game" };
  } else {
    view = data;
  }

  return {
    view,
    isConnectionLost: failuresInARow >= FAILURES_BEFORE_CONNECTION_LOST,
  };
}
