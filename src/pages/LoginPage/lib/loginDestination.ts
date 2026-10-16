import type { AuthenticatedUser } from "@/shared/api/auth";
import { ROUTES } from "@/lib/router/routes";
import { resolveSafeRedirect } from "@/lib/router/safeRedirect";

interface LoginDestinationContext {
  /** The current game id stored in this browser session, if any. */
  currentGameId: number | null;
  /** The protected route that sent the user to the login page, or the start page. */
  from: string;
}

/**
 * Picks the route a logged-in user goes to from the login page.
 * Only an admin returns to a stored game: a player's stored id may belong to an old game.
 */
export function resolveLoginDestination(
  user: AuthenticatedUser,
  { currentGameId, from }: LoginDestinationContext,
): string {
  if (currentGameId !== null && user.roles.includes("ROLE_ADMIN")) {
    return ROUTES.start(currentGameId);
  }

  const redirectPath = resolveSafeRedirect(user.redirect, ROUTES.start());
  const isStartPage =
    redirectPath === ROUTES.start() || redirectPath.startsWith(`${ROUTES.start()}/`);

  return isStartPage ? from : redirectPath;
}
