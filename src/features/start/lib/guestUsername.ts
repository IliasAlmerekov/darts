export const MIN_GUEST_LETTERS = 3;

export function countLetters(value: string): number {
  const matches = value.match(/\p{L}/gu);
  return matches ? matches.length : 0;
}

export function validateGuestUsername(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return "Please enter a username.";
  }

  if (countLetters(trimmed) < MIN_GUEST_LETTERS) {
    return "Username must contain at least 3 letters.";
  }

  return null;
}
