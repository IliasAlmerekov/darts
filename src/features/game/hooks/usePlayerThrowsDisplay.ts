import { useMemo } from "react";

interface UsePlayerThrowsDisplayParams {
  isActive: boolean;
  roundsCountLength: number;
  currentThrow1?: number | string | JSX.Element;
  currentThrow2?: number | string | JSX.Element;
  currentThrow3?: number | string | JSX.Element;
  prevThrow1?: number | string | JSX.Element;
  prevThrow2?: number | string | JSX.Element;
  prevThrow3?: number | string | JSX.Element;
  throw1IsBust?: boolean;
  throw2IsBust?: boolean;
  throw3IsBust?: boolean;
  prevThrow1IsBust?: boolean;
  prevThrow2IsBust?: boolean;
  prevThrow3IsBust?: boolean;
  bustIcon: JSX.Element;
}

interface PlayerThrowsDisplay {
  throw1: number | string | JSX.Element | undefined;
  throw2: number | string | JSX.Element | undefined;
  throw3: number | string | JSX.Element | undefined;
  throw1IsBust: boolean;
  throw2IsBust: boolean;
  throw3IsBust: boolean;
}

/**
 * Business logic hook for calculating player throw display values
 * Handles bust icons and proper throw selection (current vs previous round)
 */
export function usePlayerThrowsDisplay({
  isActive,
  roundsCountLength,
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
}: UsePlayerThrowsDisplayParams): PlayerThrowsDisplay {
  return useMemo(() => {
    // Clear previous throws for active player in rounds > 1
    const shouldClearPrev = isActive && roundsCountLength > 1;

    // Determine if we're showing current or previous round
    const hasCurrentThrows =
      currentThrow1 !== undefined || currentThrow2 !== undefined || currentThrow3 !== undefined;

    // Select which throws to show
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

    // Select which bust flags to use
    const selectedThrow1IsBust =
      throw1IsBust !== undefined ? throw1IsBust : (prevThrow1IsBust ?? false);
    const selectedThrow2IsBust =
      throw2IsBust !== undefined ? throw2IsBust : (prevThrow2IsBust ?? false);
    const selectedThrow3IsBust =
      throw3IsBust !== undefined ? throw3IsBust : (prevThrow3IsBust ?? false);

    // Apply bust icons for non-active players
    const displayThrow1 = selectedThrow1;
    let displayThrow2 = selectedThrow2;
    let displayThrow3 = selectedThrow3;

    if (!isActive) {
      // For current round throws
      if (hasCurrentThrows) {
        if (throw1IsBust) {
          displayThrow2 = bustIcon;
          displayThrow3 = bustIcon;
        } else if (throw2IsBust) {
          displayThrow3 = bustIcon;
        }
      }
      // For previous round throws
      else {
        if (prevThrow1IsBust) {
          displayThrow2 = bustIcon;
          displayThrow3 = bustIcon;
        } else if (prevThrow2IsBust) {
          displayThrow3 = bustIcon;
        }
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
  }, [
    isActive,
    roundsCountLength,
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
  ]);
}
