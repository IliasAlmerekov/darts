import { useEffect, useState } from "react";
import { getAuthenticatedUser, type AuthenticatedUser } from "@/shared/api/auth";
import { setCurrentGameId } from "@/store";

const AUTHENTICATED_USER_TIMEOUT_MS = 5000;

type UseAuthenticatedUserResult = {
  user: AuthenticatedUser | null;
  loading: boolean;
  error: string | null;
};

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/**
 * Fetches the currently authenticated user and exposes loading/error state.
 */
export const useAuthenticatedUser = (): UseAuthenticatedUserResult => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchUser = async () => {
      try {
        const userData = await getAuthenticatedUser({
          signal: controller.signal,
          timeoutMs: AUTHENTICATED_USER_TIMEOUT_MS,
        });
        if (controller.signal.aborted) {
          return;
        }

        if (userData) {
          setUser(userData);
          if (typeof userData.gameId === "number") {
            setCurrentGameId(userData.gameId);
          }
        }
      } catch (err) {
        if (isAbortError(err) || controller.signal.aborted) {
          return;
        }

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unknown error");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchUser();

    return () => {
      controller.abort();
    };
  }, []);

  return { user, loading, error };
};
