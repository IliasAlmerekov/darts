import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithCredentials, getAuthenticatedUser } from "../api";
import { mapAuthErrorMessage } from "../lib/error-handling";

/**
 * Provides login flow state and action.
 */
export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const navigateToRedirect = (redirect: string): void => {
    if (/^https?:\/\//i.test(redirect)) {
      window.location.assign(redirect);
      return;
    }
    const redirectPath = redirect === "/start" ? "/start" : redirect;
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
            navigateToRedirect(authenticatedUser.redirect);
            return;
          }
        }

        navigateToRedirect(response.redirect);
      }
    } catch (error) {
      console.error("Login error:", error);
      try {
        const authenticatedUser = await getAuthenticatedUser();
        if (authenticatedUser?.redirect) {
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
