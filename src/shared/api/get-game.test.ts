// @vitest-environment node
vi.mock("@/shared/services/browser/clientLogger", () => ({
  clientLogger: { warn: vi.fn(), error: vi.fn() },
}));

import { beforeEach, describe, expect, it, vi } from "vitest";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import {
  finishGame,
  getFinishedGame,
  getGameSettings,
  getGameThrows,
  getGameThrowsIfChanged,
  resetGameStateVersion,
} from "./game";
import {
  apiClient,
  ApiValidationError,
  clearUnauthorizedHandler,
  setUnauthorizedHandler,
} from "./client";
import { TimeoutError } from "./errors";
import { createMockResponse, respondWith } from "./test-utils";

function createValidGameResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 520,
    status: "started",
    currentRound: 1,
    activePlayerId: 1,
    currentThrowCount: 0,
    players: [
      {
        id: 1,
        name: "P1",
        score: 301,
        isActive: true,
        isBust: false,
        isGuest: false,
        position: null,
        throwsInCurrentRound: 0,
        currentRoundThrows: [],
        roundHistory: [],
      },
    ],
    winnerId: null,
    settings: {
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
    },
    ...overrides,
  };
}

describe("getGameThrowsIfChanged", () => {
  beforeEach(() => {
    resetGameStateVersion();
    clearUnauthorizedHandler();
    vi.restoreAllMocks();
    vi.mocked(clientLogger.warn).mockReset();
  });

  it("returns data for valid getGameThrows response", async () => {
    const response = createValidGameResponse();
    vi.spyOn(apiClient, "get").mockImplementationOnce(respondWith(response));

    const data = await getGameThrows(520);

    expect(data).toEqual({ type: "full-state", ...response });
    expect(apiClient.get).toHaveBeenCalledWith(
      "/game/520",
      expect.objectContaining({ validate: expect.any(Object) }),
    );
  });

  it("forwards AbortSignal through getGameThrows", async () => {
    const controller = new AbortController();
    const response = createValidGameResponse();
    vi.spyOn(apiClient, "get").mockImplementationOnce(respondWith(response));

    await getGameThrows(520, controller.signal);

    expect(apiClient.get).toHaveBeenCalledWith("/game/520", {
      signal: controller.signal,
      validate: expect.any(Object),
    });
  });

  it("forwards AbortSignal through getGameSettings", async () => {
    const controller = new AbortController();
    vi.spyOn(apiClient, "get").mockImplementationOnce(
      respondWith({
        gameId: 520,
        startScore: 301,
        doubleOut: false,
        tripleOut: true,
        status: "lobby",
      }),
    );

    await getGameSettings(520, controller.signal);

    expect(apiClient.get).toHaveBeenCalledWith("/game/520/settings", {
      signal: controller.signal,
      validate: expect.any(Object),
    });
  });

  it("rejects with ApiValidationError when getGameThrows receives invalid response shape", async () => {
    vi.spyOn(apiClient, "get").mockImplementationOnce(respondWith({ id: 520, players: [] }));

    await expect(getGameThrows(520)).rejects.toBeInstanceOf(ApiValidationError);
  });

  it("rejects with ApiValidationError when getGameThrows receives an unknown game status", async () => {
    vi.spyOn(apiClient, "get").mockImplementationOnce(
      respondWith(createValidGameResponse({ status: "active" })),
    );

    await expect(getGameThrows(520)).rejects.toBeInstanceOf(ApiValidationError);
  });

  it("rejects with ApiValidationError when getGameThrows receives invalid nested player data", async () => {
    vi.spyOn(apiClient, "get").mockImplementationOnce(
      respondWith(
        createValidGameResponse({
          players: [
            {
              id: 1,
              name: "P1",
              score: "301",
              isActive: true,
              isBust: false,
              isGuest: false,
              position: null,
              throwsInCurrentRound: 0,
              currentRoundThrows: [],
              roundHistory: [],
            },
          ],
        }),
      ),
    );

    await expect(getGameThrows(520)).rejects.toBeInstanceOf(ApiValidationError);
  });

  it("forwards AbortSignal through finishGame", async () => {
    const controller = new AbortController();
    const response = {
      gameId: 520,
      winnerRoundsPlayed: 5,
      winnerRoundAverage: 60,
      finishedPlayers: [
        { playerId: 1, username: "P1", position: 1, roundsPlayed: 5, roundAverage: 60 },
      ],
    };
    vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(response));

    await finishGame(520, controller.signal);

    expect(apiClient.post).toHaveBeenCalledWith("/game/520/finish", undefined, {
      signal: controller.signal,
      validate: expect.any(Object),
    });
  });

  it("normalizes nullable summary envelope fields from getFinishedGame", async () => {
    vi.spyOn(apiClient, "get").mockImplementationOnce(
      respondWith({
        gameId: 520,
        finishedAt: "2026-03-10T12:00:00+00:00",
        winner: { id: 1, username: "Winner" },
        winnerRoundsPlayed: 4,
        winnerRoundAverage: 62.5,
        finishedPlayers: [
          {
            playerId: 1,
            username: "Winner",
            position: 1,
            roundsPlayed: 4,
            roundAverage: 62.5,
          },
          {
            playerId: null,
            username: null,
            position: null,
            roundsPlayed: null,
            roundAverage: 0,
          },
        ],
      }),
    );

    await expect(getFinishedGame(520)).resolves.toEqual([
      {
        playerId: 1,
        username: "Winner",
        position: 1,
        roundsPlayed: 4,
        roundAverage: 62.5,
      },
      {
        playerId: 2,
        username: "Player 2",
        position: 2,
        roundsPlayed: 0,
        roundAverage: 0,
      },
    ]);
  });

  it("warns when a finished player arrives without roundsPlayed", async () => {
    vi.spyOn(apiClient, "get").mockImplementationOnce(
      respondWith({
        gameId: 520,
        finishedAt: null,
        winner: null,
        winnerRoundsPlayed: 4,
        winnerRoundAverage: 62.5,
        finishedPlayers: [
          { playerId: 1, username: "Winner", position: 1, roundsPlayed: 4, roundAverage: 62.5 },
          { playerId: 7, username: "Bob", position: 2, roundsPlayed: null, roundAverage: 0 },
        ],
      }),
    );

    await getFinishedGame(520);

    expect(vi.mocked(clientLogger.warn)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(clientLogger.warn)).toHaveBeenCalledWith(
      "game.finished-player.rounds-played.missing",
      { context: { gameId: 520, playerId: 7, index: 1 } },
    );
  });

  it("does not warn when every finished player has roundsPlayed", async () => {
    vi.spyOn(apiClient, "get").mockImplementationOnce(
      respondWith({
        gameId: 520,
        finishedAt: null,
        winner: null,
        winnerRoundsPlayed: 4,
        winnerRoundAverage: 62.5,
        finishedPlayers: [
          { playerId: 1, username: "Winner", position: 1, roundsPlayed: 4, roundAverage: 62.5 },
        ],
      }),
    );

    await getFinishedGame(520);

    expect(vi.mocked(clientLogger.warn)).not.toHaveBeenCalled();
  });

  it("routes conditional game fetches through apiClient.request and forwards AbortSignal", async () => {
    const controller = new AbortController();
    const responseBody = createValidGameResponse();
    const requestSpy = vi.spyOn(apiClient, "request").mockImplementationOnce(
      respondWith(
        responseBody,
        createMockResponse({
          body: responseBody,
          status: 200,
          headers: new Headers({
            "content-type": "application/json",
            "X-Game-State-Version": "v1",
          }),
          url: "http://localhost/api/game/520",
        }),
      ),
    );
    const fetchTrap = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("raw fetch should not be used by getGameThrowsIfChanged"));

    const data = await getGameThrowsIfChanged(520, controller.signal);

    expect(data).toEqual({ type: "full-state", ...responseBody });
    expect(requestSpy).toHaveBeenCalledWith(
      "/game/520",
      expect.objectContaining({
        method: "GET",
        signal: controller.signal,
        validate: expect.any(Object),
      }),
    );
    expect(fetchTrap).not.toHaveBeenCalled();
  });

  it("sends cached state version through apiClient.request and returns null for 304", async () => {
    const controller = new AbortController();
    const responseBody = createValidGameResponse();
    const requestSpy = vi
      .spyOn(apiClient, "request")
      .mockImplementationOnce(
        respondWith(
          responseBody,
          createMockResponse({
            body: responseBody,
            status: 200,
            headers: new Headers({ "content-type": "application/json", ETag: "etag-v1" }),
            url: "http://localhost/api/game/520",
          }),
        ),
      )
      .mockImplementationOnce(
        respondWith(
          null,
          createMockResponse({
            status: 304,
            headers: new Headers({ ETag: "etag-v1" }),
            url: "http://localhost/api/game/520?since=etag-v1",
          }),
        ),
      );
    const fetchTrap = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("raw fetch should not be used by getGameThrowsIfChanged"));

    await getGameThrowsIfChanged(520);
    const result = await getGameThrowsIfChanged(520, controller.signal);

    expect(result).toBeNull();
    expect(requestSpy).toHaveBeenNthCalledWith(
      2,
      "/game/520",
      expect.objectContaining({
        method: "GET",
        signal: controller.signal,
        query: { since: "etag-v1" },
        headers: expect.objectContaining({
          "If-None-Match": "etag-v1",
        }),
        validate: expect.any(Object),
      }),
    );
    expect(fetchTrap).not.toHaveBeenCalled();
  });

  it("surfaces TimeoutError from apiClient.request for conditional game fetches", async () => {
    const timeoutError = new TimeoutError(
      "Request timed out after 30000ms",
      "http://localhost/api/game/520",
    );

    vi.spyOn(apiClient, "request").mockRejectedValueOnce(timeoutError);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("raw fetch should not be used by getGameThrowsIfChanged"),
    );

    await expect(getGameThrowsIfChanged(520)).rejects.toBe(timeoutError);
  });

  it("rejects with ApiValidationError when conditional fetch returns invalid response shape", async () => {
    vi.spyOn(apiClient, "request").mockImplementationOnce(respondWith({ id: 520, players: [] }));

    await expect(getGameThrowsIfChanged(520)).rejects.toBeInstanceOf(ApiValidationError);
  });

  it("rejects with ApiError when a 200 conditional fetch has no body", async () => {
    vi.spyOn(apiClient, "request").mockImplementationOnce(respondWith(null));

    await expect(getGameThrowsIfChanged(520)).rejects.toMatchObject({
      name: "ApiError",
      status: 200,
    });
  });

  it("rethrows AbortError without converting it to NetworkError", async () => {
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
    vi.spyOn(apiClient, "request").mockRejectedValueOnce(abortError);

    await expect(getGameThrowsIfChanged(520)).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("propagates UnauthorizedError from apiClient.request", async () => {
    const unauthorizedHandler = vi.fn();
    setUnauthorizedHandler(unauthorizedHandler);

    vi.spyOn(apiClient, "request").mockRejectedValueOnce(
      Object.assign(new Error("Unauthorized"), {
        name: "UnauthorizedError",
        status: 401,
      }),
    );

    await expect(getGameThrowsIfChanged(520)).rejects.toMatchObject({
      name: "UnauthorizedError",
      status: 401,
    });
    expect(unauthorizedHandler).not.toHaveBeenCalled();
  });
});
