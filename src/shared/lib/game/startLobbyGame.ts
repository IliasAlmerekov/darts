import {
  createRematchGame,
  getGameSettings,
  startGame,
  type GameSettingsResponse,
} from "@/shared/api/game";
import { resetGameStore } from "@/shared/store";
import { gameQueries } from "@/shared/query/game.queries";
import { queryClient } from "@/shared/query/queryClient";

export interface StartRematchResponse {
  success: boolean;
  gameId: number;
  invitationLink: string;
  settings: GameSettingsResponse;
}

export class RematchNotStartedError extends Error {
  constructor(
    readonly gameId: number,
    cause: unknown,
  ) {
    super(`Rematch lobby ${gameId} was created but not started`, { cause });
    this.name = "RematchNotStartedError";
  }
}

export async function startLobbyGame(
  gameId: number,
  settings: GameSettingsResponse,
): Promise<void> {
  await startGame(gameId, {
    startScore: settings.startScore,
    doubleOut: settings.doubleOut,
    tripleOut: settings.tripleOut,
    round: 1,
    status: "started",
  });
  resetGameStore();
  void queryClient.invalidateQueries({ queryKey: gameQueries.tablet().queryKey });
}

export async function startRematch(previousGameId: number): Promise<StartRematchResponse> {
  const settings = await getGameSettings(previousGameId);
  const rematch = await createRematchGame(previousGameId);
  try {
    await startLobbyGame(rematch.gameId, settings);
  } catch (error) {
    throw new RematchNotStartedError(rematch.gameId, error);
  }
  return { ...rematch, settings };
}
