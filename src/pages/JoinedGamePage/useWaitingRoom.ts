import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { playerQueries } from "@/shared/query/player.queries";
import { getLobbyGameId } from "@/shared/store";
import { provesRemoval, type WaitingRoomView } from "./lib/waitingRoomView";

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
  // The lobby the player waited in before this page opened. The profile page and a reload
  // stop polling, so its game may have gone in the meantime.
  const [earlierLobbyGameId] = useState(getLobbyGameId);
  const [hasSeenGame, setHasSeenGame] = useState(false);
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

  // The current game cannot tell a finished game from a removal; the profile lists the
  // newest finished games, and a game missing from that list may be a removal.
  const mustCheckFinished = data?.kind === "none" && !hasSeenGame && earlierLobbyGameId !== null;
  const finishedCheck = useQuery({ ...playerQueries.profile(), enabled: mustCheckFinished });

  const failuresInARow = errorUpdateCount - failureBaseline.errorUpdateCount;
  let view: WaitingRoomView;
  if (data === undefined) {
    view = { kind: "loading" };
  } else if (data.kind !== "none") {
    view = data;
  } else if (hasSeenGame) {
    view = { kind: "removed" };
  } else if (!mustCheckFinished) {
    view = { kind: "no-game" };
  } else if (!finishedCheck.isFetchedAfterMount) {
    // A profile cached before the game finished would call it a removal.
    view = { kind: "loading" };
  } else if (finishedCheck.isError || finishedCheck.data === undefined) {
    view = { kind: "no-game" };
  } else {
    const isRemoved = provesRemoval(finishedCheck.data.history, earlierLobbyGameId);
    view = { kind: isRemoved ? "removed" : "no-game" };
  }

  return {
    view,
    isConnectionLost: failuresInARow >= FAILURES_BEFORE_CONNECTION_LOST,
  };
}
