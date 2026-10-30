import type { WinnerPlayerProps } from "@/types";

type PlayerRound = WinnerPlayerProps["rounds"][number];

/** What one of a scoreboard row's three throw cells shows, and whether it is bust-styled. */
export type ThrowSlot =
  | { kind: "value"; label: string; isBust: boolean }
  | { kind: "bust-icon"; isBust: boolean }
  | { kind: "empty"; isBust: boolean };

type Triple<T> = readonly [T, T, T];

export type ThrowSlots = Triple<ThrowSlot>;

type SlotIndex = 0 | 1 | 2;

interface RoundThrow {
  label: string | undefined;
  isBust: boolean | undefined;
}

interface PlayerThrowsDisplayOptions {
  currentRound: PlayerRound | undefined;
  previousRound: PlayerRound | undefined;
  isActive: boolean;
  isBust?: boolean | undefined;
}

function mapTriple<T, U>(triple: Triple<T>, map: (item: T, index: SlotIndex) => U): Triple<U> {
  return [map(triple[0], 0), map(triple[1], 1), map(triple[2], 2)];
}

function formatThrowLabel(
  value: number | string | undefined,
  isDouble: boolean | undefined,
  isTriple: boolean | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  if (isDouble) return `D${value}`;
  if (isTriple) return `T${value}`;
  return String(value);
}

function readRoundThrows(round: PlayerRound | undefined): Triple<RoundThrow> {
  return [
    {
      label: formatThrowLabel(round?.throw1, round?.throw1IsDouble, round?.throw1IsTriple),
      isBust: round?.throw1IsBust,
    },
    {
      label: formatThrowLabel(round?.throw2, round?.throw2IsDouble, round?.throw2IsTriple),
      isBust: round?.throw2IsBust,
    },
    {
      label: formatThrowLabel(round?.throw3, round?.throw3IsDouble, round?.throw3IsTriple),
      isBust: round?.throw3IsBust,
    },
  ];
}

function findLastShownIndex(labels: Triple<string | undefined>): SlotIndex | undefined {
  if (labels[2] !== undefined) return 2;
  if (labels[1] !== undefined) return 1;
  if (labels[0] !== undefined) return 0;
  return undefined;
}

/**
 * Resolves the three throw cells of a scoreboard row from the player's current and
 * previous round.
 */
export function getPlayerThrowsDisplay({
  currentRound,
  previousRound,
  isActive,
  isBust = false,
}: PlayerThrowsDisplayOptions): ThrowSlots {
  const current = readRoundThrows(currentRound);
  const previous = readRoundThrows(previousRound);
  const hasCurrentThrows = current.some((roundThrow) => roundThrow.label !== undefined);

  // A started round never borrows from the previous one. An empty round shows the previous
  // round's throws only for a player who is waiting for their turn.
  const labels = mapTriple(current, (currentThrow, index) => {
    if (hasCurrentThrows) return currentThrow.label;
    return isActive ? undefined : previous[index].label;
  });

  const throwBustFlags = mapTriple(
    current,
    (currentThrow, index) => currentThrow.isBust ?? previous[index].isBust ?? false,
  );

  // The backend may flag the player as bust without flagging a throw. The last shown throw
  // takes the bust styling then.
  const inferredBustIndex =
    isBust && !throwBustFlags.includes(true) ? findLastShownIndex(labels) : undefined;
  const bustFlags = mapTriple(
    throwBustFlags,
    (isThrowBust, index) => isThrowBust || index === inferredBustIndex,
  );

  // A waiting player's bust round shows the bust icon in every slot after the bust throw.
  let firstBustIconIndex: SlotIndex | undefined;
  if (!isActive && bustFlags[0]) firstBustIconIndex = 1;
  else if (!isActive && bustFlags[1]) firstBustIconIndex = 2;

  return mapTriple(labels, (label, index): ThrowSlot => {
    const slotIsBust = bustFlags[index];
    if (firstBustIconIndex !== undefined && index >= firstBustIconIndex) {
      return { kind: "bust-icon", isBust: slotIsBust };
    }
    if (label === undefined) return { kind: "empty", isBust: slotIsBust };
    return { kind: "value", label, isBust: slotIsBust };
  });
}
