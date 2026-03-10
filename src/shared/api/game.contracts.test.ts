// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./client";
import { finishGame, undoLastThrow, updateGameSettings } from "./game";

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

  it("returns compact settings when PATCH /settings already responds with GameSettingsResponse", async () => {
    vi.spyOn(apiClient, "patch").mockResolvedValueOnce({
      startScore: 501,
      doubleOut: true,
      tripleOut: false,
    });

    const response = await updateGameSettings(42, {
      doubleOut: true,
      tripleOut: false,
    });

    expect(response).toEqual({
      startScore: 501,
      doubleOut: true,
      tripleOut: false,
    });
  });

  it("extracts settings from the legacy full game response for PATCH /settings", async () => {
    vi.spyOn(apiClient, "patch").mockResolvedValueOnce({
      ...createLegacyGameResponse(),
      settings: {
        startScore: 501,
        doubleOut: true,
        tripleOut: false,
      },
    });

    const response = await updateGameSettings(42, {
      doubleOut: true,
      tripleOut: false,
    });

    expect(response).toEqual({
      startScore: 501,
      doubleOut: true,
      tripleOut: false,
    });
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
    vi.spyOn(apiClient, "post").mockResolvedValueOnce(summaryResponse);

    const response = await finishGame(42);

    expect(response).toEqual(summaryResponse.finishedPlayers);
  });

  it("keeps supporting the legacy full undo response during phased rollout", async () => {
    const fullResponse = createLegacyGameResponse();
    vi.spyOn(apiClient, "delete").mockResolvedValueOnce(fullResponse);

    const response = await undoLastThrow(42);

    expect(response).toEqual(fullResponse);
  });

  it("returns compact undo acknowledgement without refetching game state", async () => {
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
    const deleteSpy = vi.spyOn(apiClient, "delete").mockResolvedValueOnce(compactUndoAck);

    const response = await undoLastThrow(42);

    expect(deleteSpy).toHaveBeenCalledWith("/game/42/throw");
    expect(response).toEqual(compactUndoAck);
  });
});
