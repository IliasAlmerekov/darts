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
  const numericValue = parseInt(input.slice(1));

  if (isNaN(numericValue)) {
    throw new Error(`Invalid throw value: ${input}`);
  }

  return {
    value: numericValue,
    isDouble: modifier === "D",
    isTriple: modifier === "T",
  };
}
