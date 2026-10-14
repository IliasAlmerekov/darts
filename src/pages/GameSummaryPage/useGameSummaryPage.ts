import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, type LoaderFunctionArgs } from "react-router-dom";
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
import { applyOptimisticUndo } from "@/lib/game/applyOptimisticUndo";
import {
  buildFinishedGameStandings,
  type FinishedGameStandings,
} from "@/lib/game/finishedGameStandings";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { gameQueries } from "@/shared/query/game.queries";
import { queryClient } from "@/shared/query/queryClient";

interface UseGameSummaryPageResult extends FinishedGameStandings {
  error: string | null;
  starting: boolean;
  loadSummary: () => Promise<void>;
  handleUndo: () => Promise<void>;
  handlePlayAgain: () => Promise<void>;
  handleBackToStart: () => Promise<void>;
}

function parseGameId(param: string | undefined): number | null {
  if (!param) {
    return null;
  }

  const parsed = Number(param);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * React Router 6 loader
 * Registers the route: loader: gameSummaryLoader
 * Fills the `['finishedGame', id]` query before the page renders.
 */
export async function gameSummaryLoader({ params }: LoaderFunctionArgs): Promise<null> {
  const gameId = parseGameId(params.id);

  if (gameId === null) {
    throw new Response("Invalid game id", { status: 400 });
  }

  await queryClient.ensureQueryData(gameQueries.finished(gameId));
  return null;
}

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
  const [actionError, setActionError] = useState<string | null>(null);
  const [starting, setStarting] = useState<boolean>(false);
  const [releasedGameId, setReleasedGameId] = useState<number | null>(null);
  const startGameInFlightRef = useRef<boolean>(false);

  const finishedGameIdFromRoute = useMemo(
    () => parseGameId(summaryGameIdParam),
    [summaryGameIdParam],
  );

  const summaryQuery = useQuery({
    ...gameQueries.finished(finishedGameIdFromRoute ?? 0),
    enabled: finishedGameIdFromRoute !== null && finishedGameIdFromRoute !== releasedGameId,
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
  }, [refetch]);

  const releaseFinishedGame = useCallback(
    (gameId: number): void => {
      setReleasedGameId(gameId);
      client.removeQueries({ queryKey: gameQueries.finished(gameId).queryKey });
    },
    [client],
  );

  const { standings, podiumData, leaderBoardList } = useMemo(
    () => buildFinishedGameStandings(summaryQuery.data ?? []),
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
      clientLogger.error("game-summary.undo-reopen.failed", {
        context: {
          finishedGameId: finishedGameIdFromRoute,
          serverUndoApplied,
        },
        error: err,
      });
      setActionError(toUserErrorMessage(err, "Could not reopen game and undo throw."));
    }
  }, [finishedGameIdFromRoute, navigate, releaseFinishedGame]);

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
      clientLogger.error("game-summary.rematch.start.failed", {
        context: { finishedGameId: finishedGameIdFromRoute },
        error: err,
      });
      setActionError(toUserErrorMessage(err, "Could not start a rematch."));
    } finally {
      startGameInFlightRef.current = false;
      setStarting(false);
    }
  }, [finishedGameIdFromRoute, navigate, releaseFinishedGame]);

  const handleBackToStart = useCallback(async (): Promise<void> => {
    if (finishedGameIdFromRoute === null) return;

    resetRoomStore();

    try {
      setActionError(null);
      const rematch = await createRematchGame(finishedGameIdFromRoute);
      if (!rematch?.gameId) {
        throw new Error("Invalid rematch response: missing game id");
      }

      releaseFinishedGame(finishedGameIdFromRoute);
      setCurrentGameId(rematch.gameId);
      navigate(ROUTES.start(rematch.gameId));
    } catch (err) {
      clientLogger.error("game-summary.rematch.return-to-start.failed", {
        context: { finishedGameId: finishedGameIdFromRoute },
        error: err,
      });
      setActionError(toUserErrorMessage(err, "Could not return to start."));
    }
  }, [finishedGameIdFromRoute, navigate, releaseFinishedGame]);

  return {
    error,
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
