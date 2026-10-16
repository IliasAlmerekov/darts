import { useState } from "react";
import { ApiError } from "@/shared/api";
import {
  loginWithCredentials,
  getAuthenticatedUser,
  type AuthenticatedUser,
} from "@/shared/api/auth";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { authQueries } from "@/shared/query/auth.queries";
import { queryClient } from "@/shared/query/queryClient";
import { setCurrentGameId } from "@/shared/store";
import { mapAuthErrorMessage } from "@/lib/error/auth-error-handling";

/**
 * Provides login flow state and action.
 * A successful login puts the user into the auth query, where the login page reads it the
 * same way as after a Remembered login check.
 */
interface LoginReturn {
  login: (email: string, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const LOGIN_SUCCESS_REDIRECT_PREFIX = "/api/";

function getAuthErrorRawMessage(error: unknown): string | undefined {
  return error instanceof ApiError && error.status === 401 ? "unauthorized" : undefined;
}

function acceptLoggedInUser(user: AuthenticatedUser): void {
  if (typeof user.gameId === "number") {
    setCurrentGameId(user.gameId);
  }
  queryClient.setQueryData(authQueries.me().queryKey, user);
}

export function useLogin(): LoginReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await loginWithCredentials({ email, password });

      if (response.success === false) {
        if (!response.error) {
          const authenticatedUser = await getAuthenticatedUser();
          if (authenticatedUser) {
            acceptLoggedInUser(authenticatedUser);
            return;
          }
        }

        setError(
          mapAuthErrorMessage({
            flow: "login",
            rawMessage: response.error,
          }),
        );
        return;
      }

      if (response.redirect.startsWith(LOGIN_SUCCESS_REDIRECT_PREFIX)) {
        const authenticatedUser = await getAuthenticatedUser();
        if (authenticatedUser) {
          acceptLoggedInUser(authenticatedUser);
          return;
        }

        setError(mapAuthErrorMessage({ flow: "login", rawMessage: "unauthorized" }));
        return;
      }

      acceptLoggedInUser(response);
    } catch (error) {
      clientLogger.error("auth.login.failed", {
        error,
      });
      if (!(error instanceof ApiError && error.status === 401)) {
        try {
          const authenticatedUser = await getAuthenticatedUser();
          if (authenticatedUser) {
            acceptLoggedInUser(authenticatedUser);
            return;
          }
        } catch (sessionCheckError) {
          clientLogger.error("auth.login.session-check-after-error.failed", {
            error: sessionCheckError,
          });
        }
      }

      setError(
        mapAuthErrorMessage({
          flow: "login",
          error,
          rawMessage: getAuthErrorRawMessage(error),
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
}
