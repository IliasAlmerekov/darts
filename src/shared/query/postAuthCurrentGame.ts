import type { AuthenticatedUser } from "@/shared/api/auth";
import { setCurrentGameId } from "@/shared/store";

// The current game writes of the post-auth module, kept in their own file so that
// `authQueries.me()` can use them without importing `postAuth.ts`, which imports
// `authQueries`. An admin's current game is the Tablet game, which no auth answer carries,
// so neither write touches it.

/**
 * After a fresh login or registration, a player's current game becomes the game of the
 * answer, so a game id left over from an earlier session goes away.
 */
export function applyLoginCurrentGame(user: AuthenticatedUser): void {
  if (user.roles.includes("ROLE_ADMIN")) {
    return;
  }

  setCurrentGameId(user.gameId ?? null);
}

/**
 * After a session check, a player's current game follows a game id in the answer. An answer
 * without one keeps the stored id: the Waiting room needs it to tell a player who was removed
 * while away.
 */
export function applySessionCheckCurrentGame(user: AuthenticatedUser): void {
  if (user.roles.includes("ROLE_ADMIN") || typeof user.gameId !== "number") {
    return;
  }

  setCurrentGameId(user.gameId);
}
