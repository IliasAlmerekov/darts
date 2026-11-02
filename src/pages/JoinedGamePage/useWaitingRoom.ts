import { useState } from "react";
import { useStore } from "@nanostores/react";
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
 * Polls the player's current game and tells the Waiting room what to show. Once the player
 * has none, the seat lookup of the game they last had tells a removal from a game that is over.
 */
export function useWaitingRoom(): UseWaitingRoomResult {
  // The stored game id outlives a trip to the Player profile, and an answer of `none` clears
  // it, so the hook keeps the last one it saw.
  const currentGameId = useStore($currentGameId);
  const [lastGameId, setLastGameId] = useState(currentGameId);
  const { data, dataUpdatedAt, errorUpdateCount } = useQuery(playerQueries.currentGame());
  const seatLookup = useQuery(playerQueries.gameSeat(data?.kind === "none" ? lastGameId : null));
  const [failureBaseline, setFailureBaseline] = useState<FailureBaseline>({
    dataUpdatedAt,
    errorUpdateCount,
  });

  // Both updates run during render, so the screen never shows a stale value first.
  if (currentGameId !== null && currentGameId !== lastGameId) {
    setLastGameId(currentGameId);
  }
  if (dataUpdatedAt !== failureBaseline.dataUpdatedAt) {
    setFailureBaseline({ dataUpdatedAt, errorUpdateCount });
  }

  const failuresInARow = errorUpdateCount - failureBaseline.errorUpdateCount;
  let view: WaitingRoomView;
  if (data === undefined) {
    view = { kind: "loading" };
  } else if (data.kind === "none") {
    view =
      lastGameId !== null && seatLookup.isPending
        ? { kind: "loading" }
        : { kind: seatLookup.data === "removed" ? "removed" : "no-game" };
  } else {
    view = data;
  }

  return {
    view,
    isConnectionLost: failuresInARow >= FAILURES_BEFORE_CONNECTION_LOST,
  };
}
