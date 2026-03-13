// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameSounds } from "./useGameSounds";
import type { GameThrowsResponse, PlayerThrow } from "@/types";

const playSoundMock = vi.fn();

vi.mock("@/shared/services/browser/soundPlayer", () => ({
  playSound: (sound: string) => playSoundMock(sound),
}));

type PlayerOverrides = Partial<GameThrowsResponse["players"][number]> & {
  throws?: PlayerThrow[];
  historyThrows?: PlayerThrow[][];
};

function createGame(overrides: Partial<GameThrowsResponse> = {}): GameThrowsResponse {
  return {
    type: "full-state",
    id: 1,
    status: "started",
    currentRound: 1,
    activePlayerId: 1,
    currentThrowCount: 0,
    winnerId: null,
    settings: {
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
    },
    players: [
      createPlayer({ id: 1, name: "Alice", isActive: true }),
      createPlayer({ id: 2, name: "Bob" }),
    ],
    ...overrides,
  };
}

function createPlayer(overrides: PlayerOverrides): GameThrowsResponse["players"][number] {
  const { throws, historyThrows, ...rest } = overrides;

  return {
    id: 1,
    name: "Player",
    score: 301,
    isActive: false,
    isBust: false,
    position: null,
    throwsInCurrentRound: throws?.length ?? 0,
    currentRoundThrows: throws ?? [],
    roundHistory: (historyThrows ?? []).map((roundThrows, index) => ({
      round: index + 1,
      throws: roundThrows,
    })),
    ...rest,
  };
}

describe("useGameSounds", () => {
  beforeEach(() => {
    playSoundMock.mockReset();
  });

  it("does not play a sound on first snapshot or when data becomes null", () => {
    const initialGame = createGame();
    const { rerender } = renderHook(
      ({ game }: { game: GameThrowsResponse | null }) => useGameSounds(game),
      {
        initialProps: { game: null as GameThrowsResponse | null },
      },
    );

    rerender({ game: initialGame });
    rerender({ game: null });
    rerender({ game: createGame() });

    expect(playSoundMock).not.toHaveBeenCalled();
  });

  it("plays win sound once when the game gets a winner", () => {
    const initialGame = createGame();
    const finishedGame = createGame({
      status: "finished",
      winnerId: 2,
      players: [
        createPlayer({ id: 1, name: "Alice", isActive: false }),
        createPlayer({ id: 2, name: "Bob", isActive: true }),
      ],
    });

    const { rerender } = renderHook(
      ({ game }: { game: GameThrowsResponse | null }) => useGameSounds(game),
      {
        initialProps: { game: initialGame },
      },
    );

    rerender({ game: finishedGame });
    rerender({ game: finishedGame });

    expect(playSoundMock).toHaveBeenCalledTimes(1);
    expect(playSoundMock).toHaveBeenCalledWith("win");
  });

  it("plays error sound when a player transitions into bust state", () => {
    const initialGame = createGame({
      players: [
        createPlayer({ id: 1, name: "Alice", isActive: true }),
        createPlayer({ id: 2, name: "Bob" }),
      ],
    });
    const bustGame = createGame({
      players: [
        createPlayer({ id: 1, name: "Alice", isActive: true, isBust: true }),
        createPlayer({ id: 2, name: "Bob" }),
      ],
    });

    const { rerender } = renderHook(
      ({ game }: { game: GameThrowsResponse | null }) => useGameSounds(game),
      {
        initialProps: { game: initialGame },
      },
    );

    rerender({ game: bustGame });

    expect(playSoundMock).toHaveBeenCalledWith("error");
  });

  it("plays throw sound when throw history increases", () => {
    const initialGame = createGame({
      currentThrowCount: 1,
      players: [
        createPlayer({ id: 1, name: "Alice", isActive: true, throws: [{ value: 20 }] }),
        createPlayer({ id: 2, name: "Bob" }),
      ],
    });
    const updatedGame = createGame({
      currentThrowCount: 2,
      players: [
        createPlayer({
          id: 1,
          name: "Alice",
          isActive: true,
          throws: [{ value: 20 }, { value: 18 }],
        }),
        createPlayer({ id: 2, name: "Bob" }),
      ],
    });

    const { rerender } = renderHook(
      ({ game }: { game: GameThrowsResponse | null }) => useGameSounds(game),
      {
        initialProps: { game: initialGame },
      },
    );

    rerender({ game: updatedGame });

    expect(playSoundMock).toHaveBeenCalledWith("throw");
  });

  it("uses the fallback detector when backend only changes counters and active player", () => {
    const initialGame = createGame({
      currentThrowCount: 2,
      activePlayerId: 1,
      currentRound: 1,
      players: [
        createPlayer({ id: 1, name: "Alice", isActive: true, throwsInCurrentRound: 2 }),
        createPlayer({ id: 2, name: "Bob", isActive: false }),
      ],
    });
    const updatedGame = createGame({
      currentThrowCount: 0,
      activePlayerId: 2,
      currentRound: 2,
      players: [
        createPlayer({ id: 1, name: "Alice", isActive: false, throwsInCurrentRound: 2 }),
        createPlayer({ id: 2, name: "Bob", isActive: true }),
      ],
    });

    const { rerender } = renderHook(
      ({ game }: { game: GameThrowsResponse | null }) => useGameSounds(game),
      {
        initialProps: { game: initialGame },
      },
    );

    rerender({ game: updatedGame });

    expect(playSoundMock).toHaveBeenCalledWith("throw");
  });

  it("does not play a sound on undo-like corrections when total throws do not increase", () => {
    const initialGame = createGame({
      currentThrowCount: 2,
      activePlayerId: 1,
      currentRound: 1,
      players: [
        createPlayer({
          id: 1,
          name: "Alice",
          isActive: true,
          throws: [{ value: 20 }, { value: 20 }],
        }),
        createPlayer({ id: 2, name: "Bob" }),
      ],
    });
    const correctedGame = createGame({
      currentThrowCount: 2,
      activePlayerId: 1,
      currentRound: 1,
      players: [
        createPlayer({ id: 1, name: "Alice", isActive: true, throws: [{ value: 20 }] }),
        createPlayer({ id: 2, name: "Bob" }),
      ],
    });

    const { rerender } = renderHook(
      ({ game }: { game: GameThrowsResponse | null }) => useGameSounds(game),
      {
        initialProps: { game: initialGame },
      },
    );

    rerender({ game: correctedGame });

    expect(playSoundMock).not.toHaveBeenCalled();
  });
});
