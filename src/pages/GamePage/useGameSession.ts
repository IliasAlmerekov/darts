import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  finishGame,
  getGameThrows,
  recordThrow,
  undoLastThrow,
  type GameSettings,
} from "@/shared/api/game";
import { gameQueries } from "@/shared/query/game.queries";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { playSound } from "@/shared/services/browser/soundPlayer";
import { $gameData, resetGameStore, acceptGame } from "@/shared/store";
import {
  createGameSession,
  type GameSessionTransport,
  type GameSessionView,
} from "./lib/gameSession.logic";

type Session = ReturnType<typeof createGameSession>;
interface UseGameSessionResult {
  view: GameSessionView;
  commands: Pick<
    Session,
    | "throwDart"
    | "undo"
    | "continueGame"
    | "undoFromOverlay"
    | "finishGame"
    | "retry"
    | "updateSettings"
  >;
}
const emptyView: GameSessionView = {
  status: "idle",
  canThrow: false,
  canUndo: false,
  canRetry: false,
  isFinished: false,
  isQueueFull: false,
  canOpenSettings: false,
  shouldShowFinishOverlay: false,
  canFinishGame: false,
  activePlayers: [],
  finishedPlayers: [],
  activePlayer: null,
  game: null,
  isLoading: true,
  error: null,
  isInteractionDisabled: true,
  isUndoDisabled: true,
  isSettingsDisabled: true,
  isFinishPending: false,
  finishError: null,
};

export function useGameSession(gameId: number | null): UseGameSessionResult {
  const queryClient = useQueryClient();
  const sessionRef = useRef<Session | null>(null);
  const [view, setView] = useState<GameSessionView>(emptyView);
  useEffect(() => {
    const cached = $gameData.get();
    const cachedGame = cached?.id === gameId && cached.status !== "finished" ? cached : null;
    if (cachedGame === null) resetGameStore();
    if (gameId === null) return;
    const transport: GameSessionTransport = {
      loadGame: getGameThrows,
      recordThrow,
      undoLastThrow,
      finishGame,
    };
    const session = createGameSession({
      gameId,
      cachedGame,
      transport,
      playSound,
      log: clientLogger,
      onGameChange: acceptGame,
      onFinished: (summary) => {
        const { queryKey } = gameQueries.finished(gameId);
        void queryClient.cancelQueries({ queryKey });
        queryClient.setQueryData(queryKey, summary);
      },
    });
    sessionRef.current = session;
    const unsubscribe = session.subscribe(() => setView(session.getView()));
    return () => {
      unsubscribe();
      session.dispose();
      sessionRef.current = null;
    };
  }, [gameId, queryClient]);
  return {
    view: gameId === null ? { ...emptyView, isLoading: false } : view,
    commands: {
      throwDart: (value: string | number): void => sessionRef.current?.throwDart(value),
      undo: (): void => sessionRef.current?.undo(),
      continueGame: (): void => sessionRef.current?.continueGame(),
      undoFromOverlay: (): void => sessionRef.current?.undoFromOverlay(),
      finishGame: (): void => sessionRef.current?.finishGame(),
      retry: (): void => sessionRef.current?.retry(),
      updateSettings: (settings: GameSettings): void =>
        sessionRef.current?.updateSettings(settings),
    },
  };
}
