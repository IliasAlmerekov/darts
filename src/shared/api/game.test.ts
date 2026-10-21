// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, ApiValidationError } from "./client";
import {
  abortGame,
  createRematch,
  finishGame,
  getFinishedGame,
  getGameSettings,
  getTabletGame,
  recordThrow,
  reopenGame,
  startGame,
  undoLastThrow,
  updateGameSettings,
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

/** Contract `GameResponseDto` with every field. */
const fullGamePayload = {
  type: "full-state",
  id: 42,
  status: "started",
  currentRound: 2,
  activePlayerId: 7,
  currentThrowCount: 1,
  winnerId: null,
  players: [
    {
      id: 7,
      name: "P1",
      score: 261,
      isActive: true,
      isBust: false,
      isGuest: false,
      position: null,
      throwsInCurrentRound: 1,
      currentRoundThrows: [{ value: 20, isDouble: true, isTriple: false, isBust: false }],
      roundHistory: [],
    },
  ],
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
  type: "ack",
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

/** Contract `ScoreboardDeltaDto` with only the required keys, also on the changed player. */
const minimalScoreboardDelta = {
  changedPlayers: [{ playerId: 7, name: "P1", score: 281, isActive: true, isGuest: false }],
  status: "started",
  currentRound: 1,
};

/** Contract `ThrowAckDto` with only the required keys. */
const minimalThrowAckPayload = {
  success: true,
  gameId: 42,
  stateVersion: "v-2",
  scoreboardDelta: minimalScoreboardDelta,
  serverTs: "2026-03-10T10:00:00.000Z",
};

/** Contract `UndoAckDto` with only the required keys. */
const minimalUndoAckPayload = {
  success: true,
  gameId: 42,
  stateVersion: "v-3",
  scoreboardDelta: minimalScoreboardDelta,
  serverTs: "2026-03-10T10:00:01.000Z",
};

/** Contract `UndoAckDto` with every scoreboard key; `undoneThrow` is out of scope (#101). */
const fullUndoAckPayload = {
  type: "ack",
  success: true,
  gameId: 42,
  stateVersion: "v-undo-1",
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
    currentRound: 2,
  },
  serverTs: "2026-03-10T10:00:00.000Z",
};

/**
 * Every key the contract requires in a throw or undo ack, with a value of the wrong type.
 * A path into the delta's first changed player goes through `changedPlayers.0`.
 */
const requiredAckKeys: ReadonlyArray<[path: string, wrongValue: unknown]> = [
  ["success", "yes"],
  ["gameId", "42"],
  ["stateVersion", 2],
  ["scoreboardDelta", null],
  ["serverTs", 0],
  ["scoreboardDelta.changedPlayers", "P1"],
  ["scoreboardDelta.status", 1],
  ["scoreboardDelta.currentRound", "1"],
  ["scoreboardDelta.changedPlayers.0.playerId", "7"],
  ["scoreboardDelta.changedPlayers.0.name", 7],
  ["scoreboardDelta.changedPlayers.0.score", "281"],
  ["scoreboardDelta.changedPlayers.0.isActive", "yes"],
  ["scoreboardDelta.changedPlayers.0.isGuest", 1],
];

/** Copies `payload` and returns the copy with the object that holds the key at `path`. */
function copyWithParentOf(
  payload: object,
  path: string,
): [copy: unknown, parent: Record<string, unknown>, key: string] {
  const copy: unknown = structuredClone(payload);
  const keys = path.split(".");
  const key = keys.pop();
  if (key === undefined) {
    throw new Error("copyWithParentOf: empty path");
  }
  let parent: unknown = copy;
  for (const segment of keys) {
    parent = (parent as Record<string, unknown>)[segment];
  }
  return [copy, parent as Record<string, unknown>, key];
}

function withoutKey(payload: object, path: string): unknown {
  const [copy, parent, key] = copyWithParentOf(payload, path);
  delete parent[key];
  return copy;
}

function withValueAt(payload: object, path: string, value: unknown): unknown {
  const [copy, parent, key] = copyWithParentOf(payload, path);
  parent[key] = value;
  return copy;
}

/** One case per required ack key left out, and one per key given the wrong type. */
const malformedAckCases: ReadonlyArray<[label: string, malform: (ack: object) => unknown]> =
  requiredAckKeys.flatMap(([path, wrongValue]) => [
    [`${path} is missing`, (ack: object) => withoutKey(ack, path)],
    [`${path} has the wrong type`, (ack: object) => withValueAt(ack, path, wrongValue)],
  ]);

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
    it("sends the settings with camelCase keys", async () => {
      const post = vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith({}));

      await startGame(42, { startScore: 501, doubleOut: true, tripleOut: false });

      expect(post).toHaveBeenCalledWith(
        "/game/42/start",
        { startScore: 501, doubleOut: true, tripleOut: false },
        expect.objectContaining({ validate: expect.any(Object) }),
      );
    });

    it("resolves for a game state response", async () => {
      vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(minimalGamePayload));

      await expect(
        startGame(42, { startScore: 301, doubleOut: false, tripleOut: false }),
      ).resolves.toBeUndefined();
    });

    // The backend answers with [] until darts-backend#46 is fixed.
    it.each([[[]], [{}]])("resolves for the response body %j", async (body) => {
      vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(body));

      await expect(
        startGame(42, { startScore: 301, doubleOut: false, tripleOut: false }),
      ).resolves.toBeUndefined();
    });
  });

  describe("finishGame and getFinishedGame", () => {
    it("returns the standings from a summary without finishedAt and winner", async () => {
      const summaryResponse = {
        gameId: 42,
        winnerRoundsPlayed: 8,
        winnerRoundAverage: 57.3,
        finishedPlayers: summaryPayload.finishedPlayers,
      };
      vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(summaryResponse));

      await expect(finishGame(42)).resolves.toEqual(summaryPayload.finishedPlayers);
    });

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

  describe("getTabletGame", () => {
    it("returns the contract examples of TabletGameResponseDto", async () => {
      const started = { game: { id: 57, status: "started" }, lastFinishedGameId: 56 };
      const none = { game: null, lastFinishedGameId: 56 };
      const get = vi
        .spyOn(apiClient, "get")
        .mockImplementationOnce(respondWith(started))
        .mockImplementationOnce(respondWith(none));

      await expect(getTabletGame()).resolves.toEqual(started);
      await expect(getTabletGame()).resolves.toEqual(none);
      expect(get).toHaveBeenCalledWith("/tablet/game", expect.anything());
    });

    it("rejects with ApiValidationError when the game has a finished status", async () => {
      vi.spyOn(apiClient, "get").mockImplementationOnce(
        respondWith({ game: { id: 57, status: "finished" }, lastFinishedGameId: null }),
      );

      await expect(getTabletGame()).rejects.toBeInstanceOf(ApiValidationError);
    });
  });

  describe("updateGameSettings", () => {
    it("returns the contract GameSettingsResponseDto", async () => {
      const settingsResponse = {
        gameId: 42,
        startScore: 501,
        doubleOut: true,
        tripleOut: false,
        status: "lobby",
      };
      vi.spyOn(apiClient, "patch").mockImplementationOnce(respondWith(settingsResponse));

      await expect(updateGameSettings(42, { doubleOut: true, tripleOut: false })).resolves.toEqual(
        settingsResponse,
      );
    });

    it("rejects a full game state, which the contract does not document for PATCH /settings", async () => {
      vi.spyOn(apiClient, "patch").mockImplementationOnce(respondWith(fullGamePayload));

      await expect(
        updateGameSettings(42, { doubleOut: true, tripleOut: false }),
      ).rejects.toBeInstanceOf(ApiValidationError);
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

    it("fills the type default, null for a missing throw and winnerId, and leaves position and isBust absent", async () => {
      vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(minimalThrowAckPayload));

      const ack = await recordThrow(42, { playerId: 7, value: 20 });

      expect(ack).toEqual({
        type: "ack",
        ...minimalThrowAckPayload,
        throw: null,
        scoreboardDelta: { ...minimalScoreboardDelta, winnerId: null },
      });
      expect(ack.scoreboardDelta.changedPlayers[0]).not.toHaveProperty("position");
      expect(ack.scoreboardDelta.changedPlayers[0]).not.toHaveProperty("isBust");
    });

    it.each(malformedAckCases)(
      "rejects with ApiValidationError when %s",
      async (_label, malform) => {
        vi.spyOn(apiClient, "post").mockImplementationOnce(
          respondWith(malform(minimalThrowAckPayload)),
        );

        await expect(recordThrow(42, { playerId: 7, value: 20 })).rejects.toBeInstanceOf(
          ApiValidationError,
        );
      },
    );

    it("rejects with ApiValidationError when the type is not ack", async () => {
      vi.spyOn(apiClient, "post").mockImplementationOnce(
        respondWith({ ...throwAckPayload, type: "full-state" }),
      );

      await expect(recordThrow(42, { playerId: 7, value: 20 })).rejects.toBeInstanceOf(
        ApiValidationError,
      );
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
    it("returns a full game state response as full-state", async () => {
      vi.spyOn(apiClient, "delete").mockImplementationOnce(respondWith(fullGamePayload));

      await expect(undoLastThrow(42)).resolves.toEqual(fullGamePayload);
    });

    it("fills the full-state type default for a game state without type", async () => {
      vi.spyOn(apiClient, "delete").mockImplementationOnce(respondWith(minimalGamePayload));

      await expect(undoLastThrow(42)).resolves.toMatchObject({ type: "full-state", id: 42 });
    });

    it("returns a contract UndoAckDto as an ack", async () => {
      const deleteSpy = vi
        .spyOn(apiClient, "delete")
        .mockImplementationOnce(respondWith(fullUndoAckPayload));

      await expect(undoLastThrow(42)).resolves.toEqual(fullUndoAckPayload);
      expect(deleteSpy).toHaveBeenCalledWith(
        "/game/42/throw",
        expect.objectContaining({ validate: expect.any(Object) }),
      );
    });

    it("fills the ack type default and null winnerId for an ack with only the required keys", async () => {
      vi.spyOn(apiClient, "delete").mockImplementationOnce(respondWith(minimalUndoAckPayload));

      await expect(undoLastThrow(42)).resolves.toEqual({
        type: "ack",
        ...minimalUndoAckPayload,
        scoreboardDelta: { ...minimalScoreboardDelta, winnerId: null },
      });
    });

    it.each(malformedAckCases)(
      "rejects with ApiValidationError when %s",
      async (_label, malform) => {
        vi.spyOn(apiClient, "delete").mockImplementationOnce(
          respondWith(malform(minimalUndoAckPayload)),
        );

        await expect(undoLastThrow(42)).rejects.toBeInstanceOf(ApiValidationError);
      },
    );

    it.each([
      ["a game state", "ack", fullGamePayload],
      ["an ack", "full-state", fullUndoAckPayload],
    ])(
      "rejects with ApiValidationError when %s carries the type %s",
      async (_label, type, payload) => {
        vi.spyOn(apiClient, "delete").mockImplementationOnce(respondWith({ ...payload, type }));

        await expect(undoLastThrow(42)).rejects.toBeInstanceOf(ApiValidationError);
      },
    );

    it("rejects with ApiValidationError when the response is neither a game nor an ack", async () => {
      vi.spyOn(apiClient, "delete").mockImplementationOnce(respondWith({ success: true }));

      await expect(undoLastThrow(42)).rejects.toBeInstanceOf(ApiValidationError);
    });
  });
});
