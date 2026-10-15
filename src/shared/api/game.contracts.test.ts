// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, ApiValidationError } from "./client";
import { finishGame, undoLastThrow, updateGameSettings } from "./game";
import { respondWith } from "./test-utils";

function createLegacyGameResponse() {
  return {
    id: 42,
    status: "started" as const,
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
    settings: {
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
    },
  };
}

describe("game api contract adapters", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the contract GameSettingsResponseDto from PATCH /settings", async () => {
    vi.spyOn(apiClient, "patch").mockImplementationOnce(
      respondWith({
        gameId: 42,
        startScore: 501,
        doubleOut: true,
        tripleOut: false,
        status: "lobby",
      }),
    );

    const response = await updateGameSettings(42, {
      doubleOut: true,
      tripleOut: false,
    });

    expect(response).toEqual({
      gameId: 42,
      startScore: 501,
      doubleOut: true,
      tripleOut: false,
      status: "lobby",
    });
  });

  it("rejects a full game state from PATCH /settings, which the contract does not document", async () => {
    vi.spyOn(apiClient, "patch").mockImplementationOnce(respondWith(createLegacyGameResponse()));

    await expect(
      updateGameSettings(42, {
        doubleOut: true,
        tripleOut: false,
      }),
    ).rejects.toBeInstanceOf(ApiValidationError);
  });

  it("treats finishGame as summary-ready and returns standings DTO", async () => {
    const summaryResponse = {
      gameId: 42,
      winnerRoundsPlayed: 8,
      winnerRoundAverage: 57.3,
      finishedPlayers: [
        {
          playerId: 7,
          username: "P1",
          position: 1,
          roundsPlayed: 8,
          roundAverage: 57.3,
        },
      ],
    };
    vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(summaryResponse));

    const response = await finishGame(42);

    expect(response).toEqual(summaryResponse.finishedPlayers);
  });

  it("keeps supporting the legacy full undo response during phased rollout", async () => {
    const fullResponse = createLegacyGameResponse();
    vi.spyOn(apiClient, "delete").mockImplementationOnce(respondWith(fullResponse));

    const response = await undoLastThrow(42);

    expect(response).toEqual({ type: "full-state", ...fullResponse });
  });

  it("tags a contract UndoAckDto, which has no type field, as an ack", async () => {
    const compactUndoAck = {
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
    const deleteSpy = vi
      .spyOn(apiClient, "delete")
      .mockImplementationOnce(respondWith(compactUndoAck));

    const response = await undoLastThrow(42);

    expect(deleteSpy).toHaveBeenCalledWith(
      "/game/42/throw",
      expect.objectContaining({ validate: expect.any(Object) }),
    );
    expect(response).toEqual({ type: "ack", ...compactUndoAck });
  });
});
