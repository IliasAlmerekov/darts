const POSITIVE_INTEGER = /^[1-9]\d*$/;

/**
 * Parses an id from the URL, such as a game id or a player id. Only a positive safe integer in
 * plain digits counts: `-5`, `0`, `abc` and `1e3` are invalid and return null.
 */
export function parseRouteId(idParam: string | undefined): number | null {
  if (idParam === undefined || !POSITIVE_INTEGER.test(idParam)) {
    return null;
  }

  const id = Number(idParam);
  return Number.isSafeInteger(id) ? id : null;
}
