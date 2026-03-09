import { useMemo } from "react";
import {
  getPlayerThrowsDisplay,
  type PlayerThrowsDisplay,
  type PlayerThrowsDisplayOptions,
} from "./playerThrowsDisplay.logic";

type UsePlayerThrowsDisplayParams = PlayerThrowsDisplayOptions;

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
    return getPlayerThrowsDisplay({
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
    });
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
