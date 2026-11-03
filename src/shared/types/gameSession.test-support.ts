import type {
  GameSummaryResponse,
  GameThrowsResponse,
  ThrowAckResponse,
  ThrowRequest,
  UndoAckResponse,
} from "@/shared/api/game";

type Step<T> = T | Error | Promise<T> | (() => Promise<T>);

function scoreboardDelta(game: GameThrowsResponse): ThrowAckResponse["scoreboardDelta"] {
  return {
    changedPlayers: game.players.map((player) => ({
      playerId: player.id,
      name: player.name,
      score: player.score,
      position: player.position,
      placement: player.placement,
      isActive: player.isActive,
      isGuest: player.isGuest,
      isBust: player.isBust,
    })),
    winnerId: game.winnerId,
    status: game.status,
    currentRound: game.currentRound,
  };
}

export function scriptedThrowAck(gameId: number, game: GameThrowsResponse): ThrowAckResponse {
  return {
    type: "ack",
    success: true,
    gameId,
    stateVersion: "scripted",
    throw: null,
    scoreboardDelta: scoreboardDelta(game),
    serverTs: "2026-01-01T00:00:00Z",
  };
}

export function scriptedUndoAck(gameId: number, game: GameThrowsResponse): UndoAckResponse {
  return {
    type: "ack",
    success: true,
    gameId,
    stateVersion: "scripted",
    scoreboardDelta: scoreboardDelta(game),
    serverTs: "2026-01-01T00:00:00Z",
  };
}

async function take<T extends GameThrowsResponse | GameSummaryResponse>(
  steps: Step<T>[],
  name: string,
): Promise<T> {
  const step = steps.shift();
  if (step === undefined) throw new Error(`No scripted ${name} response`);
  if (step instanceof Error) throw step;
  return typeof step === "function" ? step() : step;
}

interface ScriptedGameBackend {
  loads: Step<GameThrowsResponse>[];
  throws: Step<GameThrowsResponse>[];
  undos: Step<GameThrowsResponse>[];
  finishes: Step<GameSummaryResponse>[];
  requests: {
    kind: "load" | "throw" | "undo" | "finish";
    gameId: number;
    throwData?: ThrowRequest;
  }[];
  loadGame: (gameId: number, signal: AbortSignal) => Promise<GameThrowsResponse>;
  recordThrow: (gameId: number, throwData: ThrowRequest) => Promise<ThrowAckResponse>;
  undoLastThrow: (gameId: number) => Promise<UndoAckResponse>;
  finishGame: (gameId: number, signal: AbortSignal) => Promise<GameSummaryResponse>;
}

export function createScriptedGameBackend(): ScriptedGameBackend {
  const loads: Step<GameThrowsResponse>[] = [];
  const throws: Step<GameThrowsResponse>[] = [];
  const undos: Step<GameThrowsResponse>[] = [];
  const finishes: Step<GameSummaryResponse>[] = [];
  const requests: {
    kind: "load" | "throw" | "undo" | "finish";
    gameId: number;
    throwData?: ThrowRequest;
  }[] = [];
  return {
    loads,
    throws,
    undos,
    finishes,
    requests,
    async loadGame(gameId: number, _signal: AbortSignal): Promise<GameThrowsResponse> {
      requests.push({ kind: "load", gameId });
      return take(loads, "load");
    },
    async recordThrow(gameId: number, throwData: ThrowRequest): Promise<ThrowAckResponse> {
      requests.push({ kind: "throw", gameId, throwData });
      const game = await take(throws, "throw");
      return scriptedThrowAck(gameId, game);
    },
    async undoLastThrow(gameId: number): Promise<UndoAckResponse> {
      requests.push({ kind: "undo", gameId });
      const game = await take(undos, "undo");
      return scriptedUndoAck(gameId, game);
    },
    async finishGame(gameId: number, _signal: AbortSignal): Promise<GameSummaryResponse> {
      requests.push({ kind: "finish", gameId });
      return take(finishes, "finish");
    },
  };
}
