import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loginWithCredentials, getAuthenticatedUser } from "@/shared/api/auth";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { invalidateAuthState, setAuthenticatedUser } from "@/shared/store/auth";
import { mapAuthErrorMessage } from "@/lib/error/auth-error-handling";
import { ROUTES } from "@/lib/router/routes";
import { resolveSafeLoginRedirect } from "./lib/safeRedirect";
import { parseLocationState } from "@/lib/router/locationState";

/**
 * Provides login flow state and action.
 */
interface LoginReturn {
  login: (email: string, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

function isLoginLocationState(s: unknown): s is { from?: string } {
  if (typeof s !== "object" || s === null) {
    return false;
  }
  if ("from" in s) {
    const record = s as Record<string, unknown>;
    return typeof record["from"] === "string";
  }
  return true;
}

export function useLogin(): LoginReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const from = resolveSafeLoginRedirect(
    parseLocationState(location.state, isLoginLocationState)?.from,
    ROUTES.start(),
  );

  const navigateToRedirect = (redirect: string): void => {
    const safeRedirect = resolveSafeLoginRedirect(redirect, from);
    const redirectPath = safeRedirect === ROUTES.start() ? from : safeRedirect;

    navigate(redirectPath);
  };

  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await loginWithCredentials({ email, password });

      if (response?.success === false) {
        if (!response.error) {
          const authenticatedUser = await getAuthenticatedUser();
          if (authenticatedUser?.redirect) {
            setAuthenticatedUser(authenticatedUser);
            navigateToRedirect(authenticatedUser.redirect);
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

      if (response?.redirect) {
        if (response.redirect.startsWith("/api/")) {
          const authenticatedUser = await getAuthenticatedUser();
          if (authenticatedUser?.redirect) {
            setAuthenticatedUser(authenticatedUser);
            navigateToRedirect(authenticatedUser.redirect);
            return;
          }
        }

        invalidateAuthState();
        navigateToRedirect(response.redirect);
      }
    } catch (error) {
      clientLogger.error("auth.login.failed", {
        error,
      });
      try {
        const authenticatedUser = await getAuthenticatedUser();
        if (authenticatedUser?.redirect) {
          setAuthenticatedUser(authenticatedUser);
          navigateToRedirect(authenticatedUser.redirect);
          return;
        }
      } catch (sessionCheckError) {
        clientLogger.error("auth.login.session-check-after-error.failed", {
          error: sessionCheckError,
        });
      }

      setError(
        mapAuthErrorMessage({
          flow: "login",
          error,
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
}
