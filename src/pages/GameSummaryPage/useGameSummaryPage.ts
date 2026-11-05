import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import { parseRouteGameId } from "@/lib/router/tabletGameRoute";
import type { FinishedGameStandings } from "@/lib/game/finishedGameStandings";
import { gameQueries } from "@/shared/query/game.queries";
import { enterRematchLobby, runSummaryAction, type SummaryAction } from "./lib/summaryActions";

interface UseGameSummaryPageResult extends FinishedGameStandings {
  error: string | null;
  /** The game is no longer the newest game; the page moves to the tablet game shortly. */
  leaving: boolean;
  /**
   * Undo, Play Again or Back To Start runs, or one has succeeded and the page is moving away.
   * The other actions wait for it (#100).
   */
  isActionPending: boolean;
  loadSummary: () => Promise<void>;
  handleUndo: () => Promise<void>;
  handlePlayAgain: () => Promise<void>;
  handleBackToStart: () => Promise<void>;
}

// Time to read the message before the page moves to the tablet game.
const LEAVE_OLD_GAME_DELAY_MS = 2_000;

/**
 * Loads summary data for a finished game and provides rematch actions.
 */
export function useGameSummaryPage(): UseGameSummaryPageResult {
  const navigate = useNavigate();
  const { id: summaryGameIdParam } = useParams<{ id?: string }>();
  const [actionErrorState, setActionErrorState] = useState<{
    gameId: number | null;
    message: string;
  } | null>(null);
  const [isActionPending, setIsActionPending] = useState<boolean>(false);
  const [releasedGameId, setReleasedGameId] = useState<number | null>(null);
  // Synchronous, so a second tap before the next render finds the lock taken.
  const actionInFlightRef = useRef<boolean>(false);
  // `lobbyGameId` is set when the page leaves for a rematch lobby the server created but did
  // not start; the client state moves to that lobby only when the page leaves.
  const [leaveState, setLeaveState] = useState<{
    gameId: number | null;
    path: string;
    lobbyGameId: number | null;
  } | null>(null);

  const finishedGameIdFromRoute = useMemo(
    () => parseRouteGameId(summaryGameIdParam),
    [summaryGameIdParam],
  );

  // A late 409 for a game the route has left must not move the summary now on screen.
  const leaveTarget = leaveState?.gameId === finishedGameIdFromRoute ? leaveState : null;
  const leavePath = leaveTarget?.path ?? null;
  const leaveLobbyGameId = leaveTarget?.lobbyGameId ?? null;

  // An action error belongs to the game it happened on, so it never follows a route change.
  const actionError =
    actionErrorState?.gameId === finishedGameIdFromRoute ? actionErrorState.message : null;
  const setActionError = useCallback(
    (message: string | null): void => {
      setActionErrorState(message === null ? null : { gameId: finishedGameIdFromRoute, message });
    },
    [finishedGameIdFromRoute],
  );

  const isRouteGameQueryEnabled =
    finishedGameIdFromRoute !== null && finishedGameIdFromRoute !== releasedGameId;
  const summaryQuery = useQuery({
    ...gameQueries.finishedStandings(finishedGameIdFromRoute ?? 0),
    enabled: isRouteGameQueryEnabled,
  });
  const { refetch } = summaryQuery;

  const error =
    actionError ??
    (summaryQuery.error
      ? toUserErrorMessage(summaryQuery.error, "Could not load finished game data.")
      : null);

  const loadSummary = useCallback(async (): Promise<void> => {
    setActionError(null);
    await refetch();
  }, [refetch, setActionError]);

  useEffect(() => {
    if (leavePath === null) return;
    const timer = window.setTimeout(() => {
      // Released only now: the summary keeps its standings on screen until the page leaves.
      if (leaveLobbyGameId !== null && finishedGameIdFromRoute !== null) {
        setReleasedGameId(finishedGameIdFromRoute);
        enterRematchLobby(finishedGameIdFromRoute, leaveLobbyGameId);
      }
      navigate(leavePath, { replace: true });
    }, LEAVE_OLD_GAME_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [finishedGameIdFromRoute, leaveLobbyGameId, leavePath, navigate]);

  // The lock stays taken after a success and after a 409 GAME_NOT_NEWEST: the summary stays on
  // screen while the page moves away, and a tap in that time must not start a second mutation.
  // Any other failure releases it, so the player can try again.
  const lockAction = useCallback((): boolean => {
    if (actionInFlightRef.current) return false;
    actionInFlightRef.current = true;
    setIsActionPending(true);
    return true;
  }, []);

  const unlockAction = useCallback((): void => {
    actionInFlightRef.current = false;
    setIsActionPending(false);
  }, []);

  const { podiumData, leaderBoardList } = summaryQuery.data ?? {
    podiumData: [],
    leaderBoardList: [],
  };

  const runAction = useCallback(
    async (action: SummaryAction): Promise<void> => {
      if (finishedGameIdFromRoute === null || !lockAction()) return;
      setActionError(null);
      const outcome = await runSummaryAction(action, finishedGameIdFromRoute);
      if (outcome.kind === "navigate") {
        setReleasedGameId(finishedGameIdFromRoute);
        navigate(outcome.path);
      } else {
        setActionError(outcome.message);
        if (outcome.kind === "leave") {
          setLeaveState({
            gameId: finishedGameIdFromRoute,
            path: outcome.path,
            lobbyGameId: outcome.lobbyGameId,
          });
        } else {
          unlockAction();
        }
      }
    },
    [finishedGameIdFromRoute, lockAction, navigate, setActionError, unlockAction],
  );

  const handleUndo = useCallback(() => runAction("undo"), [runAction]);
  const handlePlayAgain = useCallback(() => runAction("rematch-start"), [runAction]);
  const handleBackToStart = useCallback(() => runAction("rematch"), [runAction]);

  return {
    error,
    leaving: leavePath !== null,
    isActionPending,
    podiumData,
    leaderBoardList,
    loadSummary,
    handleUndo,
    handlePlayAgain,
    handleBackToStart,
  };
}
