import type { AuthenticatedUser } from "@/shared/api/auth";
import { authQueries } from "@/shared/query/auth.queries";
import { queryClient } from "@/shared/query/queryClient";
import { ROUTES } from "@/lib/router/routes";
import { setCurrentGameId } from "@/shared/store";

/** Takes over a freshly logged-in user: stores the joined game and fills the auth cache. */
export async function acceptLoggedInUser(user: AuthenticatedUser): Promise<void> {
  // A session check still running would overwrite the new user with its late answer.
  await queryClient.cancelQueries({ queryKey: authQueries.me().queryKey });
  if (typeof user.gameId === "number") {
    setCurrentGameId(user.gameId);
  }
  queryClient.setQueryData(authQueries.me().queryKey, user);
}

/**
 * Marks a shown invitation error as handled: the cached user keeps the session but points to
 * the Player profile, so a later visit to the login page redirects instead of repeating it.
 */
export function markInvitationErrorHandled(): void {
  queryClient.setQueryData(authQueries.me().queryKey, (current) => {
    if (!current) {
      return current;
    }

    const handledUser = { ...current, redirect: ROUTES.playerProfile };
    delete handledUser.invitationError;
    return handledUser;
  });
}
