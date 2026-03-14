import type { BackendPlayer, BackendRoundHistory, UIPlayer, UIRound } from "@/types";

function mapThrowsToRound(throws: BackendRoundHistory["throws"]): UIRound {
  const round: UIRound = {};
  const [throw1, throw2, throw3] = throws;

  if (throw1) {
    round.throw1 = throw1.value;
    if (throw1.isBust !== undefined) {
      round.throw1IsBust = throw1.isBust;
    }
  }

  if (throw2) {
    round.throw2 = throw2.value;
    if (throw2.isBust !== undefined) {
      round.throw2IsBust = throw2.isBust;
    }
  }

  if (throw3) {
    round.throw3 = throw3.value;
    if (throw3.isBust !== undefined) {
      round.throw3IsBust = throw3.isBust;
    }
  }

  if (throws.length > 0) {
    round.isRoundBust = throws.some((throwData) => throwData.isBust === true);
  }

  return round;
}

function mapRoundHistory(roundHistory: BackendRoundHistory[]): UIRound[] {
  if (!Array.isArray(roundHistory)) {
    return [];
  }

  const rounds: UIRound[] = [];

  roundHistory.forEach((roundData, index) => {
    const throws = roundData.throws || [];
    const mappedRound = mapThrowsToRound(throws);

    const roundNumber =
      "number" === typeof roundData.round && roundData.round > 0 ? roundData.round : index + 1;
    rounds[roundNumber - 1] = mappedRound;
  });

  return rounds;
}

function mapCurrentRound(currentRoundThrows: BackendPlayer["currentRoundThrows"]): UIRound {
  if (!Array.isArray(currentRoundThrows)) {
    return {};
  }

  return mapThrowsToRound(currentRoundThrows);
}

function hasAnyThrow(round: UIRound): boolean {
  return (
    round.throw1 !== undefined ||
    round.throw2 !== undefined ||
    round.throw3 !== undefined ||
    round.throw1IsBust !== undefined ||
    round.throw2IsBust !== undefined ||
    round.throw3IsBust !== undefined
  );
}

function mapPlayerToUI(
  player: BackendPlayer,
  index: number,
  currentRoundNumber?: number,
): UIPlayer {
  const rounds = mapRoundHistory(player.roundHistory);
  const currentRoundData = mapCurrentRound(player.currentRoundThrows);
  const shouldPlaceCurrentRound =
    "number" === typeof currentRoundNumber &&
    currentRoundNumber > 0 &&
    hasAnyThrow(currentRoundData);

  if (shouldPlaceCurrentRound) {
    rounds[currentRoundNumber - 1] = currentRoundData;
  } else {
    rounds.push(currentRoundData);
  }

  return {
    id: player.id,
    name: player.name,
    score: player.score,
    isActive: player.isActive,
    isBust: player.isBust,
    position: player.position,
    index,
    rounds,
    isPlaying: player.score > 0,
    throwCount: player.throwsInCurrentRound,
  };
}

export function mapPlayersToUI(players: BackendPlayer[], currentRoundNumber?: number): UIPlayer[] {
  return players.map((player, index) => mapPlayerToUI(player, index, currentRoundNumber));
}

export function getFinishedPlayers(players: UIPlayer[]): UIPlayer[] {
  return players
    .filter((p) => p.score === 0)
    .sort((a, b) => {
      if (a.position == null && b.position == null) return 0;
      if (a.position == null) return 1;
      if (b.position == null) return -1;
      return a.position - b.position;
    });
}
