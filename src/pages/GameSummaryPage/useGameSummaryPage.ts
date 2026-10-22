import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { replace, useNavigate, useParams, type LoaderFunctionArgs } from "react-router-dom";
import { getGameThrows, createRematchGame, startRematch, undoLastThrow } from "@/shared/api/game";
import type { UndoThrowResponse, UndoAckResponse } from "@/types";
import {
  $gameData,
  setCurrentGameId,
  setGameData,
  setGameScoreboardDelta,
  setInvitation,
  resetRoomStore,
} from "@/shared/store";
import { playSound } from "@/shared/services/browser/soundPlayer";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import { ROUTES } from "@/lib/router/routes";
import { parseRouteGameId, tabletGamePath } from "@/lib/router/tabletGameRoute";
import { applyOptimisticUndo } from "@/lib/game/applyOptimisticUndo";
import type { FinishedGameStandings } from "@/lib/game/finishedGameStandings";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { gameQueries } from "@/shared/query/game.queries";
import { queryClient } from "@/shared/query/queryClient";
import { fetchTabletGame } from "@/shared/query/tabletGameLoader";
import { isGameNotNewestError } from "./lib/gameNotNewest";
import { buildGameSummaryStandings } from "./lib/gameSummaryStandings";

/** Settings the summary needs before it can render the standings. */
export type SummarySettings =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; startScore: number };

interface UseGameSummaryPageResult extends FinishedGameStandings {
  error: string | null;
  /** The game is no longer the newest game; the page moves to the tablet game shortly. */
  leaving: boolean;
  settings: SummarySettings;
  loadSettings: () => Promise<void>;
  starting: boolean;
  loadSummary: () => Promise<void>;
  handleUndo: () => Promise<void>;
  handlePlayAgain: () => Promise<void>;
  handleBackToStart: () => Promise<void>;
}

/**
 * React Router 6 loader
 * Registers the route: loader: gameSummaryLoader
 * Only the last finished game has a summary: another game id moves to its details, replacing
 * the history entry. Returns null without fetching when the tablet game read fails or the
 * route has no valid game id.
 * Fills the `['finishedGame', id]` and the game settings queries before the page renders.
 */
export async function gameSummaryLoader({
  params,
  request,
}: LoaderFunctionArgs): Promise<Response | null> {
  const tabletGame = await fetchTabletGame(request);
  const gameId = parseRouteGameId(params.id);
  if (tabletGame === null || gameId === null) {
    return null;
  }

  if (gameId !== tabletGame.lastFinishedGameId) {
    return replace(ROUTES.details(gameId));
  }

  // A failed fetch is logged by the query function. The page then mounts, fetches again and
  // shows its Retry action, so the failure does not reach the route error boundary.
  await Promise.all([
    queryClient.ensureQueryData(gameQueries.finished(gameId)).catch(() => undefined),
    queryClient.ensureQueryData(gameQueries.settings(gameId)).catch(() => undefined),
  ]);
  return null;
}

// Time to read the message before the page moves to the tablet game.
const LEAVE_OLD_GAME_DELAY_MS = 2_000;

type SummaryAction = "undo" | "rematch" | "rematch-start";

function isUndoAckResponse(response: UndoThrowResponse): response is UndoAckResponse {
  return response.type === "ack";
}

/**
 * Loads summary data for a finished game and provides rematch actions.
 */
export function useGameSummaryPage(): UseGameSummaryPageResult {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { id: summaryGameIdParam } = useParams<{ id?: string }>();
  const [actionErrorState, setActionErrorState] = useState<{
    gameId: number | null;
    message: string;
  } | null>(null);
  const [starting, setStarting] = useState<boolean>(false);
  const [releasedGameId, setReleasedGameId] = useState<number | null>(null);
  const startGameInFlightRef = useRef<boolean>(false);
  const [leavePath, setLeavePath] = useState<string | null>(null);

  useEffect(() => {
    if (leavePath === null) return;
    const timer = window.setTimeout(() => {
      navigate(leavePath, { replace: true });
    }, LEAVE_OLD_GAME_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [leavePath, navigate]);

  const finishedGameIdFromRoute = useMemo(
    () => parseRouteGameId(summaryGameIdParam),
    [summaryGameIdParam],
  );

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
    ...gameQueries.finished(finishedGameIdFromRoute ?? 0),
    enabled: isRouteGameQueryEnabled,
  });
  const { refetch } = summaryQuery;
  const settingsQuery = useQuery({
    ...gameQueries.settings(finishedGameIdFromRoute ?? 0),
    enabled: isRouteGameQueryEnabled,
    // A finished game's settings do not change, so the copy the game page left in the game
    // store is used without a second request.
    staleTime: Infinity,
  });
  const { refetch: refetchSettings } = settingsQuery;
  const startScore = settingsQuery.data?.startScore;

  let settings: SummarySettings;
  if (typeof startScore === "number" && Number.isFinite(startScore) && startScore > 0) {
    settings = { status: "ready", startScore };
  } else if (settingsQuery.fetchStatus === "fetching") {
    settings = { status: "loading" };
  } else if (settingsQuery.error) {
    settings = {
      status: "error",
      message: toUserErrorMessage(settingsQuery.error, "Could not load game settings."),
    };
  } else {
    settings = {
      status: "error",
      message: "Could not render summary because start score is missing.",
    };
  }

  const loadSettings = useCallback(async (): Promise<void> => {
    // refetch() runs even on a disabled query, so an invalid route id must not reach it.
    if (finishedGameIdFromRoute === null) return;
    await refetchSettings();
  }, [finishedGameIdFromRoute, refetchSettings]);

  const error =
    actionError ??
    (summaryQuery.error
      ? toUserErrorMessage(summaryQuery.error, "Could not load finished game data.")
      : null);

  const loadSummary = useCallback(async (): Promise<void> => {
    setActionError(null);
    await refetch();
  }, [refetch, setActionError]);

  const releaseFinishedGame = useCallback(
    (gameId: number): void => {
      setReleasedGameId(gameId);
      client.removeQueries({ queryKey: gameQueries.finished(gameId).queryKey });
      // Undo and rematch change the tablet game, so the next route reads it again.
      void client.invalidateQueries({ queryKey: gameQueries.tablet().queryKey });
    },
    [client],
  );

  // A 409 GAME_NOT_NEWEST means another game started after this one. The cached tablet game
  // may be out of date or missing (then the path is /start); either way the target route's
  // loader reads it again and redirects to the real tablet game.
  const leaveOldGame = useCallback(
    (action: SummaryAction): void => {
      clientLogger.warn("game-summary.action.not-newest", {
        context: { finishedGameId: finishedGameIdFromRoute, action },
      });
      const tabletGame = client.getQueryData(gameQueries.tablet().queryKey);
      setLeavePath(tabletGamePath("game", tabletGame?.game ?? null));
    },
    [client, finishedGameIdFromRoute],
  );

  const { standings, podiumData, leaderBoardList } = useMemo(
    () => buildGameSummaryStandings(summaryQuery.data),
    [summaryQuery.data],
  );

  const handleUndo = useCallback(async (): Promise<void> => {
    if (finishedGameIdFromRoute === null) return;

    const currentGameData = $gameData.get();
    const optimisticUndoState =
      currentGameData && currentGameData.id === finishedGameIdFromRoute
        ? applyOptimisticUndo(currentGameData)
        : null;
    let serverUndoApplied = false;

    try {
      setActionError(null);
      if (optimisticUndoState) {
        setGameData(optimisticUndoState);
      }

      const undoResponse = await undoLastThrow(finishedGameIdFromRoute);
      serverUndoApplied = true;

      if (isUndoAckResponse(undoResponse)) {
        const gameStateBeforePatch = $gameData.get();
        setGameScoreboardDelta(undoResponse.scoreboardDelta, finishedGameIdFromRoute);
        const gameStateAfterPatch = $gameData.get();
        const patchedGameState =
          gameStateBeforePatch !== null &&
          gameStateBeforePatch.id === finishedGameIdFromRoute &&
          gameStateAfterPatch !== null &&
          gameStateAfterPatch.id === finishedGameIdFromRoute
            ? gameStateAfterPatch
            : null;
        const needsFullRefresh =
          optimisticUndoState === null ||
          patchedGameState === null ||
          (patchedGameState.status === "started" &&
            (typeof patchedGameState.activePlayerId !== "number" ||
              !Number.isFinite(patchedGameState.activePlayerId)));

        if (needsFullRefresh) {
          const refreshedGameState = await getGameThrows(finishedGameIdFromRoute);
          setGameData(refreshedGameState);
        }
      } else {
        setGameData(undoResponse);
      }

      playSound("undo");
      releaseFinishedGame(finishedGameIdFromRoute);
      navigate(ROUTES.game(finishedGameIdFromRoute), {
        state: { skipFinishOverlay: true },
      });
    } catch (err) {
      if (!serverUndoApplied && currentGameData && currentGameData.id === finishedGameIdFromRoute) {
        setGameData(currentGameData);
      }
      if (isGameNotNewestError(err)) {
        leaveOldGame("undo");
      } else {
        clientLogger.error("game-summary.undo-reopen.failed", {
          context: {
            finishedGameId: finishedGameIdFromRoute,
            serverUndoApplied,
          },
          error: err,
        });
      }
      setActionError(toUserErrorMessage(err, "Could not reopen game and undo throw."));
    }
  }, [finishedGameIdFromRoute, leaveOldGame, navigate, releaseFinishedGame, setActionError]);

  const handlePlayAgain = useCallback(async (): Promise<void> => {
    if (finishedGameIdFromRoute === null || startGameInFlightRef.current) return;

    startGameInFlightRef.current = true;
    setStarting(true);

    try {
      setActionError(null);
      const rematch = await startRematch(finishedGameIdFromRoute);
      if (!rematch?.gameId) {
        throw new Error("Invalid rematch response: missing game id");
      }

      releaseFinishedGame(finishedGameIdFromRoute);
      setCurrentGameId(rematch.gameId);
      if (rematch.invitationLink) {
        setInvitation({
          gameId: rematch.gameId,
          invitationLink: rematch.invitationLink,
        });
      }
      navigate(ROUTES.game(rematch.gameId));
    } catch (err) {
      if (isGameNotNewestError(err)) {
        leaveOldGame("rematch-start");
      } else {
        clientLogger.error("game-summary.rematch.start.failed", {
          context: { finishedGameId: finishedGameIdFromRoute },
          error: err,
        });
      }
      setActionError(toUserErrorMessage(err, "Could not start a rematch."));
    } finally {
      startGameInFlightRef.current = false;
      setStarting(false);
    }
  }, [finishedGameIdFromRoute, leaveOldGame, navigate, releaseFinishedGame, setActionError]);

  const handleBackToStart = useCallback(async (): Promise<void> => {
    if (finishedGameIdFromRoute === null) return;

    try {
      setActionError(null);
      const rematch = await createRematchGame(finishedGameIdFromRoute);
      if (!rematch?.gameId) {
        throw new Error("Invalid rematch response: missing game id");
      }

      // A failed rematch, such as 409 GAME_NOT_NEWEST, leaves the open room untouched.
      resetRoomStore();
      releaseFinishedGame(finishedGameIdFromRoute);
      setCurrentGameId(rematch.gameId);
      navigate(ROUTES.start(rematch.gameId));
    } catch (err) {
      if (isGameNotNewestError(err)) {
        leaveOldGame("rematch");
      } else {
        clientLogger.error("game-summary.rematch.return-to-start.failed", {
          context: { finishedGameId: finishedGameIdFromRoute },
          error: err,
        });
      }
      setActionError(toUserErrorMessage(err, "Could not return to start."));
    }
  }, [finishedGameIdFromRoute, leaveOldGame, navigate, releaseFinishedGame, setActionError]);

  return {
    error,
    leaving: leavePath !== null,
    settings,
    loadSettings,
    starting,
    podiumData,
    standings,
    leaderBoardList,
    loadSummary,
    handleUndo,
    handlePlayAgain,
    handleBackToStart,
  };
}
