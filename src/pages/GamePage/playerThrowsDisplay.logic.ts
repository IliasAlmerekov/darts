import type { ReactElement } from "react";

export type ThrowDisplayValue = number | string | React.ReactNode | undefined;

export interface PlayerThrowsDisplayOptions {
  isActive: boolean;
  isBust?: boolean | undefined;
  roundsCountLength: number;
  currentThrow1?: ThrowDisplayValue | undefined;
  currentThrow2?: ThrowDisplayValue | undefined;
  currentThrow3?: ThrowDisplayValue | undefined;
  prevThrow1?: ThrowDisplayValue | undefined;
  prevThrow2?: ThrowDisplayValue | undefined;
  prevThrow3?: ThrowDisplayValue | undefined;
  throw1IsBust?: boolean | undefined;
  throw2IsBust?: boolean | undefined;
  throw3IsBust?: boolean | undefined;
  prevThrow1IsBust?: boolean | undefined;
  prevThrow2IsBust?: boolean | undefined;
  prevThrow3IsBust?: boolean | undefined;
  bustIcon: ReactElement;
}

export interface PlayerThrowsDisplay {
  throw1: ThrowDisplayValue;
  throw2: ThrowDisplayValue;
  throw3: ThrowDisplayValue;
  throw1IsBust: boolean;
  throw2IsBust: boolean;
  throw3IsBust: boolean;
}

export function getPlayerThrowsDisplay({
  isActive,
  isBust = false,
  currentThrow1,
  currentThrow2,
  currentThrow3,
  prevThrow1,
  prevThrow2,
  prevThrow3,
  throw1IsBust,
  throw2IsBust,
  throw3IsBust,
  prevThrow1IsBust,
  prevThrow2IsBust,
  prevThrow3IsBust,
  bustIcon,
}: PlayerThrowsDisplayOptions): PlayerThrowsDisplay {
  const shouldClearPrev = isActive;
  const hasCurrentThrows =
    currentThrow1 !== undefined || currentThrow2 !== undefined || currentThrow3 !== undefined;

  const selectedThrow1 = hasCurrentThrows
    ? currentThrow1
    : shouldClearPrev
      ? undefined
      : prevThrow1;
  const selectedThrow2 = hasCurrentThrows
    ? currentThrow2
    : shouldClearPrev
      ? undefined
      : prevThrow2;
  const selectedThrow3 = hasCurrentThrows
    ? currentThrow3
    : shouldClearPrev
      ? undefined
      : prevThrow3;

  let selectedThrow1IsBust =
    throw1IsBust !== undefined ? throw1IsBust : (prevThrow1IsBust ?? false);
  let selectedThrow2IsBust =
    throw2IsBust !== undefined ? throw2IsBust : (prevThrow2IsBust ?? false);
  let selectedThrow3IsBust =
    throw3IsBust !== undefined ? throw3IsBust : (prevThrow3IsBust ?? false);

  if (isBust && !selectedThrow1IsBust && !selectedThrow2IsBust && !selectedThrow3IsBust) {
    if (selectedThrow3 !== undefined) {
      selectedThrow3IsBust = true;
    } else if (selectedThrow2 !== undefined) {
      selectedThrow2IsBust = true;
    } else if (selectedThrow1 !== undefined) {
      selectedThrow1IsBust = true;
    }
  }

  const displayThrow1 = selectedThrow1;
  let displayThrow2 = selectedThrow2;
  let displayThrow3 = selectedThrow3;

  if (!isActive) {
    if (selectedThrow1IsBust) {
      displayThrow2 = bustIcon;
      displayThrow3 = bustIcon;
    } else if (selectedThrow2IsBust) {
      displayThrow3 = bustIcon;
    }
  }

  return {
    throw1: displayThrow1,
    throw2: displayThrow2,
    throw3: displayThrow3,
    throw1IsBust: selectedThrow1IsBust,
    throw2IsBust: selectedThrow2IsBust,
    throw3IsBust: selectedThrow3IsBust,
  };
}
