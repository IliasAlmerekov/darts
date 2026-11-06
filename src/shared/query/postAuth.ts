import type { AuthenticatedUser } from "@/shared/api/auth";
import { authQueries } from "@/shared/query/auth.queries";
import { applyCurrentGameRule } from "@/shared/query/postAuthCurrentGame";
import { queryClient } from "@/shared/query/queryClient";
import { ROUTES } from "@/lib/router/routes";
import { resolveSafeRedirect } from "@/lib/router/safeRedirect";

/**
 * Takes over a user who just logged in or registered: applies the current game rule and
 * fills the auth cache, where `useAuthRedirect` reads the user.
 */
export async function acceptAuthenticatedUser(user: AuthenticatedUser): Promise<void> {
  // A session check still running would overwrite the new user with its late answer.
  await queryClient.cancelQueries({ queryKey: authQueries.me().queryKey });
  applyCurrentGameRule(user);
  queryClient.setQueryData(authQueries.me().queryKey, user);
}

/**
 * Picks the route an authenticated user goes to. A redirect away from the start page, such
 * as the Waiting room or the Player profile, wins. Otherwise the user goes to `from`, the
 * protected route that sent them to log in, or the start page, whose loader finds the
 * Tablet game. Both the redirect and `from` stay inside the app.
 */
export function resolveAuthDestination(user: AuthenticatedUser, from: string): string {
  const redirectPath = resolveSafeRedirect(user.redirect, ROUTES.start());
  const isStartPage =
    redirectPath === ROUTES.start() || redirectPath.startsWith(`${ROUTES.start()}/`);

  return isStartPage ? resolveSafeRedirect(from, ROUTES.start()) : redirectPath;
}

/**
 * Marks a shown invitation error as handled: the cached user keeps the session but points to
 * the Player profile, so `useAuthRedirect` opens it and a later visit to the login page
 * redirects instead of showing the error again.
 */
export function dismissInvitationError(): void {
  queryClient.setQueryData(authQueries.me().queryKey, (current) => {
    if (!current) {
      return current;
    }

    const handledUser = { ...current, redirect: ROUTES.playerProfile };
    delete handledUser.invitationError;
    return handledUser;
  });
}
