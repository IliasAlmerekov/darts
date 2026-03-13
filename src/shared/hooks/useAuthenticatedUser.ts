import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import { TimeoutError } from "@/shared/api";
import { getAuthenticatedUser, type AuthenticatedUser } from "@/shared/api/auth";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import {
  $authChecked,
  $authError,
  $user,
  setAuthenticatedUser,
  setAuthFailed,
} from "@/shared/store/auth";
import { setCurrentGameId } from "@/shared/store";

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

        if (err instanceof TimeoutError) {
          setAuthenticatedUser(null);
          return;
        }

        if (isAbortError(err)) {
          setAuthenticatedUser(null);
          return;
        }

        if (err instanceof Error) {
          clientLogger.error("auth.bootstrap.failed", {
            context: { timeoutMs: AUTHENTICATED_USER_TIMEOUT_MS },
            error: err,
          });
          setAuthFailed(err.message);
        } else {
          setAuthFailed("Unknown error");
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
