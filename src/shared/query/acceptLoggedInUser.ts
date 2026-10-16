import type { AuthenticatedUser } from "@/shared/api/auth";
import { authQueries } from "@/shared/query/auth.queries";
import { queryClient } from "@/shared/query/queryClient";
import { setCurrentGameId } from "@/shared/store";

/** Takes over a freshly logged-in user: stores the joined game and fills the auth cache. */
export function acceptLoggedInUser(user: AuthenticatedUser): void {
  if (typeof user.gameId === "number") {
    setCurrentGameId(user.gameId);
  }
  queryClient.setQueryData(authQueries.me().queryKey, user);
}
