// @vitest-environment node
import { expect, it, vi } from "vitest";
import { buildBackendPlayer, buildGameThrowsResponse } from "@/shared/types/game.test-support";
import { createScriptedGameBackend } from "@/shared/types/gameSession.test-support";
import type { GameThrowsResponse } from "@/shared/api/game";
import { createGameSession } from "./gameSession.logic";

function game(alice = 301, bob = 301): GameThrowsResponse {
  return buildGameThrowsResponse({
    id: 4,
    activePlayerId: alice === 0 ? 2 : 1,
    settings: { startScore: 301, doubleOut: false, tripleOut: false },
    players: [
      buildBackendPlayer({ id: 1, name: "Alice", score: alice, isActive: alice !== 0 }),
      buildBackendPlayer({ id: 2, name: "Bob", score: bob, isActive: alice === 0 }),
      buildBackendPlayer({ id: 3, name: "Carol", score: 301 }),
    ],
  });
}
function deferred<T>() {
  let resolve = (_value: T): void => {};
  let reject = (_error: Error): void => {};
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
async function flush(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}
function setup(cachedGame: GameThrowsResponse | null = null) {
  const transport = createScriptedGameBackend();
  const playSound = vi.fn();
  const log = { error: vi.fn(), warn: vi.fn() };
  const onGameChange = vi.fn();
  const onFinished = vi.fn();
  return {
    transport,
    playSound,
    log,
    onGameChange,
    onFinished,
    start: () =>
      createGameSession({
        gameId: 4,
        cachedGame,
        transport,
        playSound,
        log,
        onGameChange,
        onFinished,
      }),
  };
}

it("blocks input over a cached game until the first load answers", async () => {
  const context = setup(game());
  const load = deferred<GameThrowsResponse>();
  context.transport.loads.push(load.promise);
  const session = context.start();
  expect(session.getView().canThrow).toBe(false);
  load.resolve(game());
  await flush();
  expect(session.getView().canThrow).toBe(true);
});

it("offers retry after a cached first load fails", async () => {
  const context = setup(game());
  context.transport.loads.push(new Error("offline"), game());
  const session = context.start();
  await flush();
  expect(session.getView().status).toBe("loadFailed");
  expect(session.getView().canThrow).toBe(false);
  session.retry();
  await flush();
  expect(session.getView().canThrow).toBe(true);
});

it("caps unconfirmed throws at six and undo removes an unsent throw", async () => {
  const context = setup();
  const ack = deferred<GameThrowsResponse>();
  context.transport.loads.push(game());
  const server = (alice: number, bob: number, activePlayerId: number): GameThrowsResponse => {
    const current = game(alice, bob);
    return {
      ...current,
      activePlayerId,
      players: current.players.map((player) => ({
        ...player,
        isActive: player.id === activePlayerId,
      })),
    };
  };
  context.transport.throws.push(
    ack.promise,
    server(299, 301, 1),
    server(298, 301, 2),
    server(298, 300, 2),
    server(298, 299, 2),
  );
  const session = context.start();
  await flush();
  for (let i = 0; i < 6; i++) session.throwDart(1);
  expect(session.getView().isQueueFull).toBe(true);
  expect(session.getView().canUndo).toBe(true);
  session.undo();
  expect(session.getView().isQueueFull).toBe(false);
  expect(context.transport.requests.filter((request) => request.kind === "throw")).toHaveLength(1);
  ack.resolve(server(300, 301, 1));
  for (let i = 0; i < 5; i++) await flush();
  expect(context.transport.requests.filter((request) => request.kind === "throw")).toHaveLength(5);
  expect(context.transport.requests.filter((request) => request.kind === "undo")).toHaveLength(0);
  session.dispose();
});

it("blocks input on reload, goes offline if reload fails and retries", async () => {
  const context = setup();
  const reload = deferred<GameThrowsResponse>();
  context.transport.loads.push(game(), reload.promise, game());
  context.transport.throws.push(new Error("conflict"));
  const session = context.start();
  await flush();
  session.throwDart(1);
  await flush();
  expect(session.getView().status).toBe("syncing");
  expect(session.getView().canThrow).toBe(false);
  reload.reject(new Error("offline"));
  await flush();
  expect(session.getView().status).toBe("offline");
  expect(session.getView().canThrow).toBe(false);
  session.retry();
  await flush();
  expect(session.getView().status).toBe("failed");
  expect(session.getView().canThrow).toBe(true);
});

it("ignores a load after disposal", async () => {
  const context = setup();
  const load = deferred<GameThrowsResponse>();
  context.transport.loads.push(load.promise);
  const session = context.start();
  const listener = vi.fn();
  session.subscribe(listener);
  listener.mockClear();
  session.dispose();
  load.resolve(game());
  await flush();
  expect(listener).not.toHaveBeenCalled();
  expect(context.onGameChange).not.toHaveBeenCalled();
  expect(context.log.error).not.toHaveBeenCalled();
});

it("waits for checkout acknowledgement before finish and sends only one finish request", async () => {
  const context = setup();
  const ack = deferred<GameThrowsResponse>();
  const finish = deferred<[]>();
  context.transport.loads.push(game(20));
  context.transport.throws.push(ack.promise);
  context.transport.finishes.push(finish.promise);
  const session = context.start();
  await flush();
  session.throwDart(20);
  expect(session.getView().shouldShowFinishOverlay).toBe(true);
  session.finishGame();
  expect(context.transport.requests.filter((request) => request.kind === "finish")).toHaveLength(0);
  ack.resolve(game(0));
  await flush();
  session.finishGame();
  session.finishGame();
  expect(context.transport.requests.filter((request) => request.kind === "finish")).toHaveLength(1);
  finish.resolve([]);
  await flush();
  expect(context.onFinished).toHaveBeenCalledWith([]);
  expect(session.getView().isFinished).toBe(true);
});

it("clears an earlier finish error when undo enables another first checkout", async () => {
  const context = setup();
  context.transport.loads.push(game(20));
  context.transport.throws.push(game(0), game(0));
  context.transport.undos.push(game(20));
  context.transport.finishes.push(new Error("finish failed"));
  const session = context.start();
  await flush();
  session.throwDart(20);
  await flush();
  session.finishGame();
  await flush();
  expect(session.getView().finishError).not.toBeNull();
  session.continueGame();
  session.undo();
  await flush();
  expect(session.getView().shouldShowFinishOverlay).toBe(false);
  session.throwDart(20);
  await flush();
  expect(session.getView().shouldShowFinishOverlay).toBe(true);
  expect(session.getView().finishError).toBeNull();
});

it("ignores a throw acknowledgement after disposal", async () => {
  const context = setup();
  const ack = deferred<GameThrowsResponse>();
  context.transport.loads.push(game());
  context.transport.throws.push(ack.promise);
  const session = context.start();
  await flush();
  session.throwDart(1);
  const before = session.getView();
  context.onGameChange.mockClear();
  session.dispose();
  ack.resolve(game(300));
  await flush();
  expect(session.getView()).toEqual(before);
  expect(context.onGameChange).not.toHaveBeenCalled();
  expect(context.playSound).not.toHaveBeenCalled();
  expect(context.log.error).not.toHaveBeenCalled();
});

it("ignores a finish response after disposal", async () => {
  const context = setup();
  const finish = deferred<[]>();
  context.transport.loads.push(game(20));
  context.transport.throws.push(game(0));
  context.transport.finishes.push(finish.promise);
  const session = context.start();
  await flush();
  session.throwDart(20);
  await flush();
  session.finishGame();
  context.onGameChange.mockClear();
  session.dispose();
  finish.resolve([]);
  await flush();
  expect(context.onFinished).not.toHaveBeenCalled();
  expect(context.onGameChange).not.toHaveBeenCalled();
  expect(context.log.error).not.toHaveBeenCalled();
});

it("ignores an undo acknowledgement after disposal", async () => {
  const context = setup();
  const ack = deferred<GameThrowsResponse>();
  context.transport.loads.push(game());
  context.transport.throws.push(game(300));
  context.transport.undos.push(ack.promise);
  const session = context.start();
  await flush();
  session.throwDart(1);
  await flush();
  session.undo();
  const before = session.getView();
  context.onGameChange.mockClear();
  context.playSound.mockClear();
  session.dispose();
  ack.resolve(game());
  await flush();
  expect(session.getView()).toEqual(before);
  expect(context.onGameChange).not.toHaveBeenCalled();
  expect(context.playSound).not.toHaveBeenCalled();
  expect(context.log.error).not.toHaveBeenCalled();
});

it("opens the summary after the last active player checkout is acknowledged", async () => {
  const context = setup();
  const initial = game(20);
  const carol = initial.players[2];
  if (!carol) throw new Error("Expected Carol");
  const before = {
    ...initial,
    players: [initial.players[0], initial.players[1], { ...carol, score: 0 }].filter(
      (player) => player !== undefined,
    ),
  };
  const finished = {
    ...game(0),
    status: "finished" as const,
    winnerId: 3,
    players: game(0).players.map((player) => (player.id === 3 ? { ...player, score: 0 } : player)),
  };
  context.transport.loads.push(before);
  context.transport.throws.push(finished);
  const session = context.start();
  await flush();
  session.throwDart(20);
  await flush();
  expect(session.getView().isFinished).toBe(true);
  expect(session.getView().shouldShowFinishOverlay).toBe(false);
});

it("sends throws in tap order, one at a time", async () => {
  const context = setup();
  const first = deferred<GameThrowsResponse>();
  context.transport.loads.push(game());
  context.transport.throws.push(first.promise, game(262));
  const session = context.start();
  await flush();
  session.throwDart(20);
  session.throwDart(19);
  expect(
    context.transport.requests
      .filter((request) => request.kind === "throw")
      .map((request) => request.throwData?.value),
  ).toEqual([20]);
  first.resolve(game(281));
  await flush();
  expect(
    context.transport.requests
      .filter((request) => request.kind === "throw")
      .map((request) => request.throwData?.value),
  ).toEqual([20, 19]);
});

it("undoes the first checkout from the overlay and opens it again on a new checkout", async () => {
  const context = setup();
  context.transport.loads.push(game(20));
  context.transport.throws.push(game(0), game(0));
  context.transport.undos.push(game(20));
  const session = context.start();
  await flush();
  session.throwDart(20);
  await flush();
  expect(session.getView().shouldShowFinishOverlay).toBe(true);
  session.undoFromOverlay();
  await flush();
  expect(session.getView().shouldShowFinishOverlay).toBe(false);
  session.throwDart(20);
  await flush();
  expect(session.getView().shouldShowFinishOverlay).toBe(true);
});
