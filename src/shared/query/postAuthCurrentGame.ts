import type { AuthenticatedUser } from "@/shared/api/auth";
import { setCurrentGameId } from "@/shared/store";

/**
 * The current game rule of the post-auth module, kept in its own file so that
 * `authQueries.me()` can apply it without importing `postAuth.ts`, which imports
 * `authQueries`. A player's current game becomes the game of the answer, so a game id
 * left over from an earlier session goes away. An admin's current game is the Tablet game,
 * which the login answer does not carry, so it stays.
 */
export function applyCurrentGameRule(user: AuthenticatedUser): void {
  if (user.roles.includes("ROLE_ADMIN")) {
    return;
  }

  setCurrentGameId(user.gameId ?? null);
}
