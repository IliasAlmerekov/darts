import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import { getAuthenticatedUser, type AuthenticatedUser } from "@/shared/api/auth";
import { $authChecked, $authError, $user, setAuthenticatedUser, setAuthError } from "@/store/auth";
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
  const user = useStore($user);
  const checked = useStore($authChecked);
  const error = useStore($authError);

  useEffect(() => {
    if (checked) {
      return;
    }

    const controller = new AbortController();

    const fetchUser = async (): Promise<void> => {
      try {
        const userData = await getAuthenticatedUser({
          signal: controller.signal,
          timeoutMs: AUTHENTICATED_USER_TIMEOUT_MS,
        });
        if (controller.signal.aborted) {
          return;
        }

        setAuthenticatedUser(userData);

        if (userData) {
          if (typeof userData.gameId === "number") {
            setCurrentGameId(userData.gameId);
          }
        }
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        if (isAbortError(err)) {
          setAuthenticatedUser(null);
          return;
        }

        if (err instanceof Error) {
          setAuthError(err.message);
        } else {
          setAuthError("Unknown error");
        }
      }
    };

    void fetchUser();

    return () => {
      controller.abort();
    };
  }, [checked]);

  return { user, loading: !checked, error };
};
