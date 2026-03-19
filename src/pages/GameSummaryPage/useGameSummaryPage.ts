import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
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
  UndoThrowResponse,
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
  setLastFinishedGameSummary,
  resetRoomStore,
} from "@/shared/store";
import { playSound } from "@/shared/services/browser/soundPlayer";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import { ROUTES } from "@/lib/router/routes";
import { applyOptimisticUndo } from "@/lib/game/applyOptimisticUndo";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { parseLocationState } from "@/lib/router/locationState";

interface SummaryLocationState {
  finishedGameId?: number;
  summary?: FinishedPlayerResponse[];
}

interface UseGameSummaryPageResult {
  error: string | null;
  starting: boolean;
  podiumData: WinnerPlayerProps[];
  newList: WinnerPlayerProps[];
  leaderBoardList: WinnerPlayerProps[];
  loadSummary: () => Promise<void>;
  handleUndo: () => Promise<void>;
  handlePlayAgain: () => Promise<void>;
  handleBackToStart: () => Promise<void>;
}

function createEmptyRound(): WinnerPlayerProps["rounds"][number] {
  return {};
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

function isSummaryLocationState(s: unknown): s is SummaryLocationState {
  return (
    typeof s === "object" &&
    s !== null &&
    (!Object.prototype.hasOwnProperty.call(s, "finishedGameId") ||
      typeof Reflect.get(s, "finishedGameId") === "number") &&
    (!Object.prototype.hasOwnProperty.call(s, "summary") ||
      isFinishedPlayerResponseArray(Reflect.get(s, "summary")))
  );
}

function isUndoAckResponse(response: UndoThrowResponse): response is UndoAckResponse {
  return response.type === "ack";
}

/**
 * Loads summary data for a finished game and provides rematch actions.
 */
export function useGameSummaryPage(): UseGameSummaryPageResult {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: summaryGameIdParam } = useParams<{ id?: string }>();
  const lastFinishedGameSummary = useStore($lastFinishedGameSummary);
  const [serverFinished, setServerFinished] = useState<FinishedPlayerResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<boolean>(false);
  const startGameInFlightRef = useRef<boolean>(false);

  const finishedGameIdFromRoute = useMemo(() => {
    const stateGameId = parseLocationState(location.state, isSummaryLocationState)?.finishedGameId;
    if ("number" === typeof stateGameId) {
      return stateGameId;
    }

    if (!summaryGameIdParam) {
      return null;
    }

    const parsedParam = Number(summaryGameIdParam);
    return Number.isFinite(parsedParam) && parsedParam > 0 ? parsedParam : null;
  }, [location.state, summaryGameIdParam]);

  const summaryFromNavigationState = useMemo(() => {
    const locationState = parseLocationState(location.state, isSummaryLocationState);
    if (!locationState || locationState.finishedGameId !== finishedGameIdFromRoute) {
      return null;
    }

    return isFinishedPlayerResponseArray(locationState.summary) ? locationState.summary : null;
  }, [finishedGameIdFromRoute, location.state]);

  const summaryFromStore = useMemo(() => {
    if (!lastFinishedGameSummary || lastFinishedGameSummary.gameId !== finishedGameIdFromRoute) {
      return null;
    }

    return lastFinishedGameSummary.summary;
  }, [finishedGameIdFromRoute, lastFinishedGameSummary]);

  const finishedSummary = summaryFromNavigationState ?? summaryFromStore ?? serverFinished;

  const loadSummary = useCallback(async (): Promise<void> => {
    if (finishedGameIdFromRoute === null) return;

    try {
      setError(null);
      const data = await getFinishedGame(finishedGameIdFromRoute);
      setServerFinished(data);
      setLastFinishedGameSummary({ gameId: finishedGameIdFromRoute, summary: data });
    } catch (err: unknown) {
      clientLogger.error("game-summary.fetch.failed", {
        context: { finishedGameId: finishedGameIdFromRoute },
        error: err,
      });
      setError(toUserErrorMessage(err, "Could not load finished game data."));
    }
  }, [finishedGameIdFromRoute]);

  useEffect((): void => {
    if (finishedGameIdFromRoute === null) {
      return;
    }

    if (summaryFromNavigationState) {
      setError(null);
      setLastFinishedGameSummary({
        gameId: finishedGameIdFromRoute,
        summary: summaryFromNavigationState,
      });
      return;
    }

    if (summaryFromStore) {
      setError(null);
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
          rounds: Array.from({ length: roundsPlayed }, () => createEmptyRound()),
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
    rounds: [createEmptyRound()],
  });
  const podiumData = podiumList.length === 2 ? podiumListWithPlaceholder : podiumList;

  const handleUndo = useCallback(async (): Promise<void> => {
    if (finishedGameIdFromRoute === null) return;

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
    if (finishedGameIdFromRoute === null || startGameInFlightRef.current) return;

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
    if (finishedGameIdFromRoute === null) return;

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
