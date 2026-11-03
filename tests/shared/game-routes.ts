import type { Page, Request, Route } from "./test";
import { mockTabletGame, startedTabletGame } from "./tablet-game-mocks";
import { createScriptedGameBackend } from "../../src/shared/types/gameSession.test-support";
import type {
  ThrowAckResponse,
  UndoAckResponse,
  GameThrowsResponse,
} from "../../src/shared/api/game";

type PlayerThrow = {
  value: number;
  isDouble: boolean;
  isTriple: boolean;
  isBust: boolean;
};

type RoundHistory = {
  round?: number;
  throws: PlayerThrow[];
};

type MockPlayer = {
  id: number;
  name: string;
  score: number;
  isActive: boolean;
  isBust: boolean;
  isGuest: boolean;
  position: number | null;
  placement?: number | null;
  throwsInCurrentRound: number;
  currentRoundThrows: PlayerThrow[];
  roundHistory: RoundHistory[];
};

type MockGameState = {
  id: number;
  status: "started" | "finished" | "lobby";
  currentRound: number;
  activePlayerId: number;
  currentThrowCount: number;
  players: MockPlayer[];
  winnerId: number | null;
  settings: {
    startScore: number;
    doubleOut: boolean;
    tripleOut: boolean;
  };
};

type ThrowRequestPayload = {
  playerId: number;
  value: number;
  isDouble?: boolean;
  isTriple?: boolean;
};

export type RouteOptions = {
  gameId?: number;
  initialState: MockGameState;
  throwStates?: MockGameState[];
  undoStates?: MockGameState[];
  undoResponseDelayMs?: number;
  conflictOnThrow?: boolean;
  conflictRefetchState?: MockGameState;
  onUndoRequest?: (request: Request) => void;
  onSettingsRequest?: (payload: { doubleOut?: boolean; tripleOut?: boolean }) => void;
};

const jsonFromRequest = <T>(request: Request): T => {
  const parsed = request.postDataJSON();
  return parsed as T;
};

export const installGameRoutes = async (page: Page, options: RouteOptions): Promise<void> => {
  const gameId = options.gameId ?? 1;
  let currentState: MockGameState = options.initialState;
  const backend = createScriptedGameBackend();
  const serverState = (): GameThrowsResponse => ({
    ...currentState,
    type: "full-state",
    players: currentState.players.map((player) => ({
      ...player,
      placement: player.placement ?? null,
    })),
  });
  const throwStates = [...(options.throwStates ?? [])];
  const undoStates = [...(options.undoStates ?? [])];
  let throwSequence = 0;

  const answerTabletGame = await mockTabletGame(page, startedTabletGame(gameId));
  let getCount = 0;

  await page.route(`**/api/game/${gameId}*`, async (route: Route, request: Request) => {
    if (request.method() !== "GET") {
      await route.fallback();
      return;
    }

    getCount += 1;

    if (options.conflictOnThrow && options.conflictRefetchState && getCount >= 2) {
      currentState = options.conflictRefetchState;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "X-Game-State-Version": `v${getCount}`,
      },
      body: JSON.stringify(currentState),
    });
  });

  const answerUndo = async (route: Route, request: Request): Promise<void> => {
    options.onUndoRequest?.(request);
    const nextState = undoStates.shift();
    if (nextState) {
      currentState = nextState;
    }

    if (options.undoResponseDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.undoResponseDelayMs));
    }

    backend.undos.push(serverState());
    const ack = await backend.undoLastThrow(gameId);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ack),
    });
  };

  await page.route(`**/api/game/${gameId}/throw/delta`, async (route: Route, request: Request) => {
    if (request.method() === "DELETE") {
      await answerUndo(route, request);
      return;
    }

    if (options.conflictOnThrow && throwSequence === 0) {
      throwSequence += 1;
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ error: "GAME_THROW_NOT_ALLOWED" }),
      });
      return;
    }

    const nextState = throwStates.shift();
    if (nextState) {
      currentState = nextState;
    }
    // The backend finishes the game with the winning throw, so the tablet has no game left.
    if (currentState.status === "finished") {
      answerTabletGame({ game: null, lastFinishedGameId: gameId });
    }

    throwSequence += 1;
    backend.throws.push(serverState());
    const payload = jsonFromRequest<ThrowRequestPayload>(request);
    const ack = await backend.recordThrow(gameId, payload);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ack),
    });
  });

  await page.route(`**/api/game/${gameId}/settings`, async (route: Route, request: Request) => {
    if (request.method() !== "PATCH") {
      await route.fallback();
      return;
    }

    const payload = jsonFromRequest<{ doubleOut?: boolean; tripleOut?: boolean }>(request);
    options.onSettingsRequest?.(payload);

    currentState = {
      ...currentState,
      settings: {
        ...currentState.settings,
        doubleOut: !!payload.doubleOut,
        tripleOut: !!payload.tripleOut,
      },
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        gameId,
        ...currentState.settings,
        status: currentState.status,
      }),
    });
  });
};

export async function fulfillScriptedGameAck(
  route: Route,
  ack: ThrowAckResponse | UndoAckResponse,
): Promise<void> {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ack) });
}
