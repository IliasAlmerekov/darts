// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, ApiValidationError } from "./client";
import {
  abortGame,
  createRematch,
  finishGame,
  getFinishedGame,
  getGameSettings,
  recordThrow,
  reopenGame,
  startGame,
  undoLastThrow,
} from "./game";
import { respondWith } from "./test-utils";

// The contract has no examples for the game DTOs; these payloads follow its schemas.

/** Contract `GameResponseDto` with only the required player fields. */
const minimalGamePayload = {
  id: 42,
  status: "lobby",
  currentRound: 1,
  currentThrowCount: 0,
  players: [{ id: 7, name: "P1", score: 301, isActive: false, isBust: false, isGuest: true }],
  settings: { startScore: 301, doubleOut: false, tripleOut: false },
};

/** Contract `GameSummaryResponseDto`. */
const summaryPayload = {
  gameId: 42,
  finishedAt: "2026-03-10T12:00:00+00:00",
  winner: { id: 7, username: "P1" },
  winnerRoundsPlayed: 8,
  winnerRoundAverage: 57.3,
  finishedPlayers: [
    { playerId: 7, username: "P1", position: 1, roundsPlayed: 8, roundAverage: 57.3 },
  ],
};

/** Contract `ThrowAckDto`. */
const throwAckPayload = {
  success: true,
  gameId: 42,
  stateVersion: "v-2",
  throw: {
    id: 1,
    playerId: 7,
    playerName: "P1",
    value: 20,
    isDouble: false,
    isTriple: false,
    isBust: false,
    score: 281,
    roundNumber: 1,
    timestamp: "2026-03-10T10:00:00.000Z",
  },
  scoreboardDelta: {
    changedPlayers: [
      {
        playerId: 7,
        name: "P1",
        score: 281,
        position: null,
        isActive: true,
        isGuest: false,
        isBust: false,
      },
    ],
    winnerId: null,
    status: "started",
    currentRound: 1,
  },
  serverTs: "2026-03-10T10:00:00.000Z",
};

describe("game api contract payloads", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("reopenGame", () => {
    it("fills the contract defaults for optional game and player fields", async () => {
      vi.spyOn(apiClient, "patch").mockImplementationOnce(respondWith(minimalGamePayload));

      await expect(reopenGame(42)).resolves.toEqual({
        type: "full-state",
        ...minimalGamePayload,
        activePlayerId: null,
        winnerId: null,
        players: [
          {
            ...minimalGamePayload.players[0],
            position: null,
            throwsInCurrentRound: 0,
            currentRoundThrows: [],
            roundHistory: [],
          },
        ],
      });
    });

    it("rejects with ApiValidationError when a player has no isGuest flag", async () => {
      vi.spyOn(apiClient, "patch").mockImplementationOnce(
        respondWith({
          ...minimalGamePayload,
          players: [{ id: 7, name: "P1", score: 301, isActive: false, isBust: false }],
        }),
      );

      await expect(reopenGame(42)).rejects.toBeInstanceOf(ApiValidationError);
    });
  });

  describe("startGame", () => {
    it("resolves for a game state response", async () => {
      vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(minimalGamePayload));

      await expect(
        startGame(42, { startScore: 301, doubleOut: false, tripleOut: false }),
      ).resolves.toBeUndefined();
    });

    it("rejects with ApiValidationError when the response is not an object", async () => {
      vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith("started"));

      await expect(
        startGame(42, { startScore: 301, doubleOut: false, tripleOut: false }),
      ).rejects.toBeInstanceOf(ApiValidationError);
    });
  });

  describe("finishGame and getFinishedGame", () => {
    it("maps a summary without the optional finishedAt and winner", async () => {
      vi.spyOn(apiClient, "get").mockImplementationOnce(
        respondWith({
          gameId: 42,
          winnerRoundsPlayed: 8,
          winnerRoundAverage: 57.3,
          finishedPlayers: summaryPayload.finishedPlayers,
        }),
      );

      await expect(getFinishedGame(42)).resolves.toEqual(summaryPayload.finishedPlayers);
    });

    it("rejects with ApiValidationError when finishedPlayers is missing", async () => {
      vi.spyOn(apiClient, "post").mockImplementationOnce(
        respondWith({ gameId: 42, winnerRoundsPlayed: 8, winnerRoundAverage: 57.3 }),
      );

      await expect(finishGame(42)).rejects.toBeInstanceOf(ApiValidationError);
    });
  });

  describe("abortGame", () => {
    it("returns the contract SuccessMessageDto with its success default", async () => {
      vi.spyOn(apiClient, "patch").mockImplementationOnce(respondWith({ message: "Game aborted" }));

      await expect(abortGame(42)).resolves.toEqual({ message: "Game aborted", success: true });
    });

    it("rejects with ApiValidationError when message is missing", async () => {
      vi.spyOn(apiClient, "patch").mockImplementationOnce(respondWith({ success: true }));

      await expect(abortGame(42)).rejects.toBeInstanceOf(ApiValidationError);
    });
  });

  describe("getGameSettings", () => {
    it("rejects with ApiValidationError when the contract-required gameId is missing", async () => {
      vi.spyOn(apiClient, "get").mockImplementationOnce(
        respondWith({ startScore: 301, doubleOut: false, tripleOut: false, status: "lobby" }),
      );

      await expect(getGameSettings(42)).rejects.toBeInstanceOf(ApiValidationError);
    });
  });

  describe("createRematch", () => {
    it("rejects with ApiError when the contract-valid invitation has no link", async () => {
      vi.spyOn(apiClient, "post")
        .mockImplementationOnce(respondWith({ success: true, gameId: 777 }))
        .mockImplementationOnce(
          respondWith({ success: false, gameId: null, invitationLink: null }),
        );

      await expect(createRematch(42)).rejects.toMatchObject({ name: "ApiError", status: 200 });
    });
  });

  describe("recordThrow", () => {
    it("returns the contract ThrowAckDto", async () => {
      vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(throwAckPayload));

      await expect(recordThrow(42, { playerId: 7, value: 20 })).resolves.toEqual(throwAckPayload);
    });

    it("rejects with ApiValidationError when the scoreboard delta has an unknown status", async () => {
      vi.spyOn(apiClient, "post").mockImplementationOnce(
        respondWith({
          ...throwAckPayload,
          scoreboardDelta: { ...throwAckPayload.scoreboardDelta, status: "paused" },
        }),
      );

      await expect(recordThrow(42, { playerId: 7, value: 20 })).rejects.toBeInstanceOf(
        ApiValidationError,
      );
    });
  });

  describe("undoLastThrow", () => {
    it("rejects with ApiValidationError when the response is neither a game nor an ack", async () => {
      vi.spyOn(apiClient, "delete").mockImplementationOnce(respondWith({ success: true }));

      await expect(undoLastThrow(42)).rejects.toBeInstanceOf(ApiValidationError);
    });
  });
});
