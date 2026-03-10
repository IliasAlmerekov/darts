import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  getFinishedGame,
  getGameSettings,
  createRematch,
  startGame,
  undoLastThrow,
} from "@/shared/api/game";
import type { FinishedPlayerResponse, GameSummaryResponse, WinnerPlayerProps } from "@/types";
import {
  $lastFinishedGameSummary,
  setGameData,
  setInvitation,
  setLastFinishedGameId,
  setLastFinishedGameSummary,
  resetRoomStore,
} from "@/store";
import { playSound } from "@/lib/soundPlayer";
import { toUserErrorMessage } from "@/lib/error-to-user-message";
import { ROUTES } from "@/lib/routes";

interface SummaryLocationState {
  finishedGameId?: number;
  summary?: unknown;
}

function isFinishedPlayerResponse(value: unknown): value is FinishedPlayerResponse {
  if (null === value || "object" !== typeof value) {
    return false;
  }

  const player = value as Partial<FinishedPlayerResponse>;
  return (
    "number" === typeof player.playerId &&
    Number.isFinite(player.playerId) &&
    "string" === typeof player.username &&
    "number" === typeof player.position &&
    Number.isFinite(player.position) &&
    "number" === typeof player.roundsPlayed &&
    Number.isFinite(player.roundsPlayed) &&
    "number" === typeof player.roundAverage &&
    Number.isFinite(player.roundAverage)
  );
}

function isGameSummaryResponse(value: unknown): value is GameSummaryResponse {
  return Array.isArray(value) && value.every(isFinishedPlayerResponse);
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
    const stateSummary = (location.state as SummaryLocationState | null)?.summary;
    return isGameSummaryResponse(stateSummary) ? stateSummary : null;
  }, [location.state]);

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
      console.error("Failed to fetch finished game:", err);
      setError(toUserErrorMessage(err, "Could not load finished game data."));
    }
  }, [finishedGameIdFromRoute]);

  useEffect(() => {
    if (!finishedGameIdFromRoute) {
      return;
    }

    if (summaryFromNavigationState ?? summaryFromStore) {
      setError(null);
      setLastFinishedGameId(finishedGameIdFromRoute);
      setLastFinishedGameSummary({
        gameId: finishedGameIdFromRoute,
        summary: summaryFromNavigationState ?? summaryFromStore ?? [],
      });
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

    try {
      setError(null);
      const updatedGameState = await undoLastThrow(finishedGameIdFromRoute);
      setGameData(updatedGameState);

      playSound("undo");
      navigate(ROUTES.game(finishedGameIdFromRoute), {
        state: { skipFinishOverlay: true },
      });
    } catch (err) {
      console.error("Failed to reopen game and undo throw:", err);
      setError(toUserErrorMessage(err, "Could not reopen game and undo throw."));
    }
  }, [finishedGameIdFromRoute, navigate]);

  const handlePlayAgain = useCallback(async (): Promise<void> => {
    if (!finishedGameIdFromRoute || startGameInFlightRef.current) return;

    startGameInFlightRef.current = true;
    setStarting(true);

    try {
      setError(null);
      const canonicalSettings = await getGameSettings(finishedGameIdFromRoute);
      const rematch = await createRematch(finishedGameIdFromRoute);
      if (!rematch?.gameId) {
        throw new Error("Invalid rematch response: missing game id");
      }

      setInvitation({
        gameId: rematch.gameId,
        invitationLink: rematch.invitationLink,
      });

      await startGame(rematch.gameId, {
        startScore: canonicalSettings.startScore,
        doubleOut: canonicalSettings.doubleOut,
        tripleOut: canonicalSettings.tripleOut,
        round: 1,
        status: "started",
      });

      navigate(ROUTES.game(rematch.gameId));
    } catch (err) {
      console.error("Failed to start rematch:", err);
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
      const rematch = await createRematch(finishedGameIdFromRoute);

      setInvitation({
        gameId: rematch.gameId,
        invitationLink: rematch.invitationLink,
      });

      navigate(ROUTES.start(rematch.gameId));
    } catch (err) {
      console.error("Failed to start rematch:", err);
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
