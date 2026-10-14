/** The `offset` search param, or 0 (the first page) when it is missing, negative or fractional. */
export function parseOffset(value: string | null): number {
  const parsed = Number(value ?? "0");
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}
