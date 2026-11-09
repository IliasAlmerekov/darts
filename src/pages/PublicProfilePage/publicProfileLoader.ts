import { replace, type LoaderFunctionArgs } from "react-router-dom";
import { parseRouteId } from "@/lib/router/routeId";
import { ROUTES } from "@/lib/router/routes";
import { authQueries } from "@/shared/query/auth.queries";
import { playerQueries } from "@/shared/query/player.queries";
import { queryClient } from "@/shared/query/queryClient";

/**
 * Fills the Public profile query of the route's player id before the page renders. An invalid
 * id throws a 404 route error response before any read; the player's own id redirects to their
 * own Player profile. A failed read stays in the query, and the page shows it.
 */
export async function publicProfileLoader({ params }: LoaderFunctionArgs): Promise<null> {
  const playerId = parseRouteId(params.id);
  if (playerId === null) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  const user = await queryClient.ensureQueryData(authQueries.me()).catch(() => null);
  // ProtectedRoutes sends a visitor without a player session away, so they need no read.
  if (user === null || !user.roles.includes("ROLE_PLAYER")) {
    return null;
  }
  if (user.id === playerId) {
    throw replace(ROUTES.playerProfile);
  }

  await queryClient.ensureQueryData(playerQueries.publicProfile(playerId)).catch(() => undefined);
  return null;
}
