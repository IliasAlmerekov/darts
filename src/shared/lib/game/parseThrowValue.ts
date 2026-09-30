import { ApiError } from "@/shared/api";

export interface ParsedThrow {
  value: number;
  isDouble: boolean;
  isTriple: boolean;
}

/**
 * Parses a throw value into numeric value and multiplier flags.
 */
export function parseThrowValue(input: string | number): ParsedThrow {
  if (typeof input === "number") {
    return {
      value: input,
      isDouble: false,
      isTriple: false,
    };
  }

  const modifier = input.charAt(0);
  const numericValue = parseInt(input.slice(1), 10);

  if ((modifier !== "D" && modifier !== "T") || Number.isNaN(numericValue)) {
    throw new ApiError(`Invalid throw value: ${input}`, {
      status: 400,
      data: { input },
    });
  }

  return {
    value: numericValue,
    isDouble: modifier === "D",
    isTriple: modifier === "T",
  };
}
