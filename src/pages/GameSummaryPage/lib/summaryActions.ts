import { createRematchGame, undoLastThrow } from "@/shared/api/game";
import { setCurrentGameId, setInvitation, resetRoomStore } from "@/shared/store";
import { playSound } from "@/shared/services/browser/soundPlayer";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { isApiErrorCode } from "@/lib/error/api-error-code";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import { RematchNotStartedError, startRematch } from "@/lib/game/startLobbyGame";
import { ROUTES } from "@/lib/router/routes";
import { tabletGamePath } from "@/lib/router/tabletGameRoute";
import { gameQueries } from "@/shared/query/game.queries";
import { queryClient } from "@/shared/query/queryClient";

export type SummaryAction = "undo" | "rematch-start" | "rematch";
export type SummaryOutcome =
  | { kind: "navigate"; path: string }
  | { kind: "leave"; path: string; lobbyGameId: number | null; message: string }
  | { kind: "failed"; message: string };

function releaseFinishedGame(gameId: number): void {
  queryClient.removeQueries({ queryKey: gameQueries.finished(gameId).queryKey });
  void queryClient.invalidateQueries({ queryKey: gameQueries.tablet().queryKey });
}

export function enterRematchLobby(finishedGameId: number, lobbyGameId: number): void {
  resetRoomStore();
  releaseFinishedGame(finishedGameId);
  setCurrentGameId(lobbyGameId);
}

export async function runSummaryAction(
  action: SummaryAction,
  finishedGameId: number,
  isCurrent: () => boolean = () => true,
): Promise<SummaryOutcome> {
  try {
    if (action === "undo") {
      await undoLastThrow(finishedGameId);
      if (isCurrent()) playSound("undo");
      releaseFinishedGame(finishedGameId);
      return { kind: "navigate", path: ROUTES.game(finishedGameId) };
    }
    if (action === "rematch-start") {
      const rematch = await startRematch(finishedGameId, isCurrent);
      releaseFinishedGame(finishedGameId);
      if (isCurrent()) {
        setCurrentGameId(rematch.gameId);
        setInvitation({ gameId: rematch.gameId, invitationLink: rematch.invitationLink });
      }
      return { kind: "navigate", path: ROUTES.game(rematch.gameId) };
    }
    const rematch = await createRematchGame(finishedGameId);
    if (isCurrent()) enterRematchLobby(finishedGameId, rematch.gameId);
    else releaseFinishedGame(finishedGameId);
    return { kind: "navigate", path: ROUTES.start(rematch.gameId) };
  } catch (error) {
    const failure = error instanceof RematchNotStartedError ? error.cause : error;
    const fallback =
      action === "undo"
        ? "Could not reopen game and undo throw."
        : action === "rematch-start"
          ? "Could not start a rematch."
          : "Could not return to start.";
    const message = toUserErrorMessage(failure, fallback);
    if (isApiErrorCode(failure, "GAME_NOT_NEWEST")) {
      clientLogger.warn("game-summary.action.not-newest", { context: { finishedGameId, action } });
      const tabletGame = queryClient.getQueryData(gameQueries.tablet().queryKey);
      return {
        kind: "leave",
        path: tabletGamePath("game", tabletGame?.game ?? null),
        lobbyGameId: null,
        message,
      };
    }
    if (error instanceof RematchNotStartedError) {
      clientLogger.error("game-summary.rematch.lobby-start.failed", {
        context: { finishedGameId, lobbyGameId: error.gameId },
        error: error.cause,
      });
      return {
        kind: "leave",
        path: ROUTES.start(error.gameId),
        lobbyGameId: error.gameId,
        message,
      };
    }
    const event =
      action === "undo"
        ? "game-summary.undo-reopen.failed"
        : action === "rematch-start"
          ? "game-summary.rematch.start.failed"
          : "game-summary.rematch.return-to-start.failed";
    clientLogger.error(event, { context: { finishedGameId }, error });
    return { kind: "failed", message };
  }
}
