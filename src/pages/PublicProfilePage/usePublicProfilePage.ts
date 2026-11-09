import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { ApiError } from "@/shared/api";
import type { PublicProfile } from "@/lib/player/profile";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import { parseRouteId } from "@/lib/router/routeId";
import { playerQueries } from "@/shared/query/player.queries";

export type PublicProfileState =
  | { status: "pending" }
  | { status: "not-found" }
  | { status: "error"; message: string; retry: () => void }
  | { status: "success"; profile: PublicProfile };

/** Reads the Public profile of the route's player id, which the route loader has filled. */
export function usePublicProfilePage(): PublicProfileState {
  const { id } = useParams<{ id?: string }>();
  // The loader answers an invalid id with a 404 route error, so the page never sees one.
  const playerId = parseRouteId(id);
  const { data, error, refetch } = useQuery(playerQueries.publicProfile(playerId));

  if (error instanceof ApiError && error.status === 404) {
    return { status: "not-found" };
  }
  // A failed request shows its error even when an older answer is still cached.
  if (error !== null) {
    return {
      status: "error",
      message: toUserErrorMessage(error),
      retry: () => void refetch(),
    };
  }
  return data === undefined ? { status: "pending" } : { status: "success", profile: data };
}
