import { queryOptions } from "@tanstack/react-query";
import { TimeoutError } from "@/shared/api";
import { getAuthenticatedUser } from "@/shared/api/auth";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { applyCurrentGameRule } from "@/shared/query/postAuthCurrentGame";

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
      // The login page waits on this check. Offline the default mode would pause it before
      // the request starts, so its 5 s timeout never fires and the spinner stays up.
      networkMode: "always",
      queryFn: async ({ signal }) => {
        try {
          const user = await getAuthenticatedUser({
            signal,
            timeoutMs: AUTHENTICATED_USER_TIMEOUT_MS,
          });
          // The query writes the cache itself; only the current game rule runs here. A guest
          // (null) leaves the current game alone.
          if (!signal.aborted && user !== null) {
            applyCurrentGameRule(user);
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
