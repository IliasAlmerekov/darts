import { queryOptions } from "@tanstack/react-query";
import { TimeoutError } from "@/shared/api";
import { getAuthenticatedUser } from "@/shared/api/auth";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { setCurrentGameId } from "@/shared/store";

const AUTHENTICATED_USER_TIMEOUT_MS = 5000;

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export const authQueries = {
  /** The authenticated user, or null when there is no session. */
  me: () =>
    queryOptions({
      queryKey: ["auth", "me"] as const,
      // The session check ran once per session before; 401 and logout clear the cache.
      staleTime: Infinity,
      queryFn: async ({ signal }) => {
        try {
          const user = await getAuthenticatedUser({
            signal,
            timeoutMs: AUTHENTICATED_USER_TIMEOUT_MS,
          });
          if (!signal.aborted && typeof user?.gameId === "number") {
            setCurrentGameId(user.gameId);
          }
          return user;
        } catch (error: unknown) {
          if (signal.aborted) {
            throw error;
          }
          if (error instanceof TimeoutError || isAbortError(error)) {
            return null;
          }
          clientLogger.error("auth.bootstrap.failed", {
            context: { timeoutMs: AUTHENTICATED_USER_TIMEOUT_MS },
            error,
          });
          throw error;
        }
      },
    }),
};
