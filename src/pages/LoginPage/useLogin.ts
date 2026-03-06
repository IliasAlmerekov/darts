import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loginWithCredentials, getAuthenticatedUser } from "@/shared/api/auth";
import { invalidateAuthState, setAuthenticatedUser } from "@/store/auth";
import { mapAuthErrorMessage } from "@/lib/auth-error-handling";
import { ROUTES } from "@/lib/routes";

const isInternalPath = (path: string): boolean => path.startsWith("/") && !path.startsWith("//");

/**
 * Provides login flow state and action.
 */
export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const from = ((): string => {
    const raw = (location.state as { from?: string } | null)?.from;
    return raw && isInternalPath(raw) ? raw : ROUTES.start();
  })();

  const navigateToRedirect = (redirect: string): void => {
    if (/^https?:\/\//i.test(redirect)) {
      window.location.assign(redirect);
      return;
    }
    const redirectPath = redirect === ROUTES.start() ? from : redirect;
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
      console.error("Login error:", error);
      try {
        const authenticatedUser = await getAuthenticatedUser();
        if (authenticatedUser?.redirect) {
          setAuthenticatedUser(authenticatedUser);
          navigateToRedirect(authenticatedUser.redirect);
          return;
        }
      } catch (sessionCheckError) {
        console.error("Failed to check authenticated user after login error:", sessionCheckError);
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
