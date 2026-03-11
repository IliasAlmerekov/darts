import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  getFinishedGame,
  getGameThrows,
  createRematchGame,
  startRematch,
  undoLastThrow,
} from "@/shared/api/game";
import type {
  FinishedPlayerResponse,
  GameThrowsResponse,
  UndoAckResponse,
  WinnerPlayerProps,
} from "@/types";
import {
  $gameData,
  $lastFinishedGameSummary,
  setCurrentGameId,
  setGameData,
  setGameScoreboardDelta,
  setInvitation,
  setLastFinishedGameId,
  setLastFinishedGameSummary,
  resetRoomStore,
} from "@/store";
import { playSound } from "@/lib/soundPlayer";
import { toUserErrorMessage } from "@/lib/error-to-user-message";
import { ROUTES } from "@/lib/routes";
import { applyOptimisticUndo } from "@/shared/lib/applyOptimisticUndo";
import { clientLogger } from "@/shared/lib/clientLogger";

interface SummaryLocationState {
  finishedGameId?: number;
  summary?: FinishedPlayerResponse[];
}

function isFinishedPlayerResponseArray(value: unknown): value is FinishedPlayerResponse[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        typeof item.playerId === "number" &&
        typeof item.username === "string" &&
        typeof item.position === "number" &&
        typeof item.roundsPlayed === "number" &&
        typeof item.roundAverage === "number",
    )
  );
}

function isUndoAckResponse(
  response: GameThrowsResponse | UndoAckResponse,
): response is UndoAckResponse {
  return "scoreboardDelta" in response;
}

/**
 * Loads summary data for a finished game and provides rematch actions.
 */
export function useGameSummaryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: summaryGameIdParam } = useParams<{ id?: string }>();
  const [serverFinished, setServerFinished] = useState<FinishedPlayerResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<boolean>(false);
  const startGameInFlightRef = useRef<boolean>(false);

  const finishedGameIdFromRoute = useMemo(() => {
    const stateGameId = (location.state as SummaryLocationState | null)?.finishedGameId;
    if ("number" === typeof stateGameId) {
      return stateGameId;
    }

    if (!summaryGameIdParam) {
      return null;
    }

    const parsedParam = Number(summaryGameIdParam);
    return Number.isFinite(parsedParam) ? parsedParam : null;
  }, [location.state, summaryGameIdParam]);

  const summaryFromNavigationState = useMemo(() => {
    const locationState = location.state as SummaryLocationState | null;
    if (!locationState || locationState.finishedGameId !== finishedGameIdFromRoute) {
      return null;
    }

    return isFinishedPlayerResponseArray(locationState.summary) ? locationState.summary : null;
  }, [finishedGameIdFromRoute, location.state]);

  const summaryFromStore = useMemo(() => {
    const cachedSummary = $lastFinishedGameSummary.get();
    if (!cachedSummary || cachedSummary.gameId !== finishedGameIdFromRoute) {
      return null;
    }

    return cachedSummary.summary;
  }, [finishedGameIdFromRoute]);

  const finishedSummary = summaryFromNavigationState ?? summaryFromStore ?? serverFinished;

  const loadSummary = useCallback(async (): Promise<void> => {
    if (!finishedGameIdFromRoute) return;

    try {
      setError(null);
      const data = await getFinishedGame(finishedGameIdFromRoute);
      setServerFinished(data);
      setLastFinishedGameId(finishedGameIdFromRoute);
      setLastFinishedGameSummary({ gameId: finishedGameIdFromRoute, summary: data });
    } catch (err: unknown) {
      clientLogger.error("game-summary.fetch.failed", {
        context: { finishedGameId: finishedGameIdFromRoute },
        error: err,
      });
      setError(toUserErrorMessage(err, "Could not load finished game data."));
    }
  }, [finishedGameIdFromRoute]);

  useEffect(() => {
    if (!finishedGameIdFromRoute) {
      return;
    }

    if (summaryFromNavigationState) {
      setError(null);
      setLastFinishedGameId(finishedGameIdFromRoute);
      setLastFinishedGameSummary({
        gameId: finishedGameIdFromRoute,
        summary: summaryFromNavigationState,
      });
      return;
    }

    if (summaryFromStore) {
      setError(null);
      setLastFinishedGameId(finishedGameIdFromRoute);
      return;
    }

    void loadSummary();
  }, [finishedGameIdFromRoute, loadSummary, summaryFromNavigationState, summaryFromStore]);

  const newList: WinnerPlayerProps[] = useMemo(() => {
    if (finishedSummary.length > 0) {
      return finishedSummary.map((player) => {
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
    }
    return [];
  }, [finishedSummary]);

  const podiumList = newList.slice(0, 3);
  const leaderBoardList = newList.slice(3, newList.length);
  const podiumListWithPlaceholder = [...podiumList];
  podiumListWithPlaceholder.push({
    id: 0,
    name: "-",
    score: 0,
    isActive: false,
    index: 0,
    rounds: [{ throw1: undefined, throw2: undefined, throw3: undefined }],
  });
  const podiumData = podiumList.length === 2 ? podiumListWithPlaceholder : podiumList;

  const handleUndo = useCallback(async (): Promise<void> => {
    if (!finishedGameIdFromRoute) return;

    const currentGameData = $gameData.get();
    const optimisticUndoState =
      currentGameData && currentGameData.id === finishedGameIdFromRoute
        ? applyOptimisticUndo(currentGameData)
        : null;
    let serverUndoApplied = false;

    try {
      setError(null);
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
      setError(toUserErrorMessage(err, "Could not reopen game and undo throw."));
    }
  }, [finishedGameIdFromRoute, navigate]);

  const handlePlayAgain = useCallback(async (): Promise<void> => {
    if (!finishedGameIdFromRoute || startGameInFlightRef.current) return;

    startGameInFlightRef.current = true;
    setStarting(true);

    try {
      setError(null);
      const rematch = await startRematch(finishedGameIdFromRoute);
      if (!rematch?.gameId) {
        throw new Error("Invalid rematch response: missing game id");
      }

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
      setError(toUserErrorMessage(err, "Could not start a rematch."));
    } finally {
      startGameInFlightRef.current = false;
      setStarting(false);
    }
  }, [finishedGameIdFromRoute, navigate]);

  const handleBackToStart = useCallback(async (): Promise<void> => {
    if (!finishedGameIdFromRoute) return;

    setLastFinishedGameId(finishedGameIdFromRoute);
    resetRoomStore();

    try {
      setError(null);
      const rematch = await createRematchGame(finishedGameIdFromRoute);
      if (!rematch?.gameId) {
        throw new Error("Invalid rematch response: missing game id");
      }

      setCurrentGameId(rematch.gameId);
      navigate(ROUTES.start(rematch.gameId));
    } catch (err) {
      clientLogger.error("game-summary.rematch.return-to-start.failed", {
        context: { finishedGameId: finishedGameIdFromRoute },
        error: err,
      });
      setError(toUserErrorMessage(err, "Could not return to start."));
    }
  }, [finishedGameIdFromRoute, navigate]);

  return {
    error,
    starting,
    podiumData,
    newList,
    leaderBoardList,
    loadSummary,
    handleUndo,
    handlePlayAgain,
    handleBackToStart,
  };
}
