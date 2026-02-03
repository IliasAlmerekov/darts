import { useEffect, useRef } from "react";
import type { GameThrowsResponse } from "../api";
import { playSound } from "@/lib/soundPlayer";

type ThrowLike = {
  value: number;
  isDouble?: boolean;
  isTriple?: boolean;
  isBust?: boolean;
};

function getPlayerThrowCount(player: GameThrowsResponse["players"][number]): number {
  const historyCount = (player.roundHistory ?? []).reduce((sum, round) => {
    return sum + (round.throws?.length ?? 0);
  }, 0);

  const currentRoundThrowsCount = player.currentRoundThrows?.length ?? 0;
  // Some backends keep `throwsInCurrentRound` in sync even if `currentRoundThrows` is not populated yet.
  const currentRoundCount = Math.max(currentRoundThrowsCount, player.throwsInCurrentRound ?? 0);

  return historyCount + currentRoundCount;
}

function getTotalThrowCount(game: GameThrowsResponse): number {
  return game.players.reduce((sum, player) => sum + getPlayerThrowCount(player), 0);
}

function getLastThrow(player: GameThrowsResponse["players"][number]): ThrowLike | null {
  const current = player.currentRoundThrows ?? [];
  if (current.length > 0) {
    return current[current.length - 1] ?? null;
  }

  const history = player.roundHistory ?? [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const throws = history[i]?.throws ?? [];
    if (throws.length > 0) {
      return throws[throws.length - 1] ?? null;
    }
  }

  return null;
}

function createThrowKey(game: GameThrowsResponse, playerId: number): string | null {
  const player = game.players.find((p) => p.id === playerId);
  if (!player) return null;

  const count = getPlayerThrowCount(player);
  const lastThrow = getLastThrow(player);
  if (!lastThrow) {
    return ["throw", game.id, playerId, count].join(":");
  }

  return [
    "throw",
    game.id,
    playerId,
    count,
    lastThrow.value,
    lastThrow.isDouble ? 1 : 0,
    lastThrow.isTriple ? 1 : 0,
    lastThrow.isBust ? 1 : 0,
  ].join(":");
}

export function useGameSounds(gameData: GameThrowsResponse | null): void {
  const previousGameRef = useRef<GameThrowsResponse | null>(null);
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!gameData) {
      previousGameRef.current = null;
      lastKeyRef.current = null;
      return;
    }

    const previousGame = previousGameRef.current;
    if (!previousGame) {
      previousGameRef.current = gameData;
      return;
    }

    const didWin =
      (previousGame.status !== "finished" && gameData.status === "finished") ||
      previousGame.winnerId !== gameData.winnerId;

    if (didWin && gameData.winnerId) {
      const key = `win:${gameData.id}:${gameData.winnerId}`;
      if (key !== lastKeyRef.current) {
        playSound("win");
        lastKeyRef.current = key;
      }

      previousGameRef.current = gameData;
      return;
    }

    const previousTotalThrows = getTotalThrowCount(previousGame);
    const nextTotalThrows = getTotalThrowCount(gameData);
    const previousServerThrowCount = previousGame.currentThrowCount ?? null;
    const nextServerThrowCount = gameData.currentThrowCount ?? null;

    // Bust may be reflected via `player.isBust` even when the bust throw itself is not persisted.
    // In that case total throw count can stay the same, so we check bust transitions explicitly.
    const bustingPlayerId =
      gameData.players.find((nextPlayer) => {
        const prevPlayer = previousGame.players.find((p) => p.id === nextPlayer.id);
        if (!prevPlayer) return false;
        return !prevPlayer.isBust && nextPlayer.isBust;
      })?.id ?? null;

    if (bustingPlayerId) {
      const key = `bust:${gameData.id}:${bustingPlayerId}:${nextTotalThrows}:${gameData.currentRound}`;
      if (key !== lastKeyRef.current) {
        playSound("error");
        lastKeyRef.current = key;
      }

      previousGameRef.current = gameData;
      return;
    }

    const increasedPlayerId =
      gameData.players.find((nextPlayer) => {
        const prevPlayer = previousGame.players.find((p) => p.id === nextPlayer.id);
        if (!prevPlayer) return false;
        return getPlayerThrowCount(nextPlayer) > getPlayerThrowCount(prevPlayer);
      })?.id ?? null;

    // Primary detection: throw history/count increased.
    if (increasedPlayerId) {
      const key = createThrowKey(gameData, increasedPlayerId);
      if (key && key !== lastKeyRef.current) {
        const player = gameData.players.find((p) => p.id === increasedPlayerId) ?? null;
        const prevPlayer = previousGame.players.find((p) => p.id === increasedPlayerId) ?? null;
        const lastThrow = player ? getLastThrow(player) : null;
        const isBust = !!(lastThrow?.isBust || (player?.isBust && !prevPlayer?.isBust));

        playSound(isBust ? "error" : "throw");
        lastKeyRef.current = key;
      }

      previousGameRef.current = gameData;
      return;
    }

    // Fallback: backend applied a throw but didn't update arrays in a way we can count.
    const serverThrowChanged =
      (previousServerThrowCount !== null &&
        nextServerThrowCount !== null &&
        nextServerThrowCount !== previousServerThrowCount) ||
      gameData.activePlayerId !== previousGame.activePlayerId ||
      gameData.currentRound !== previousGame.currentRound;

    if (serverThrowChanged) {
      // If the active player changed (or throwCount reset), the throw belongs to the previous active player.
      const likelyThrowerId =
        gameData.activePlayerId !== previousGame.activePlayerId ||
        (previousServerThrowCount !== null &&
          nextServerThrowCount !== null &&
          nextServerThrowCount < previousServerThrowCount)
          ? previousGame.activePlayerId
          : gameData.activePlayerId;

      const key = [
        "throw-fallback",
        gameData.id,
        likelyThrowerId,
        previousGame.currentRound,
        previousServerThrowCount ?? "x",
        gameData.currentRound,
        nextServerThrowCount ?? "x",
      ].join(":");

      if (key !== lastKeyRef.current) {
        const player = gameData.players.find((p) => p.id === likelyThrowerId) ?? null;
        const prevPlayer = previousGame.players.find((p) => p.id === likelyThrowerId) ?? null;
        const lastThrow = player ? getLastThrow(player) : null;
        const isBust = !!(lastThrow?.isBust || (player?.isBust && !prevPlayer?.isBust));

        playSound(isBust ? "error" : "throw");
        lastKeyRef.current = key;
      }

      previousGameRef.current = gameData;
      return;
    }

    // Avoid accidental sound playback on undo or other state corrections.
    if (nextTotalThrows <= previousTotalThrows) {
      previousGameRef.current = gameData;
      return;
    }

    previousGameRef.current = gameData;
  }, [gameData]);
}
