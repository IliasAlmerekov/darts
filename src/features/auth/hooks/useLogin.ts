import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithCredentials, getAuthenticatedUser } from "../api";
import { isCsrfRelatedAuthError, mapAuthErrorMessage } from "../lib/error-handling";

/**
 * Provides login flow state and action.
 */
export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const navigateToRedirect = (redirect: string): void => {
    const redirectPath = redirect === "/start" ? "/start" : redirect;
    navigate(redirectPath);
  };

  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await loginWithCredentials({ email, password });

      if (response?.success === false) {
        if (isCsrfRelatedAuthError(undefined, response.error)) {
          try {
            const retryResponse = await loginWithCredentials({ email, password }, true);
            if (retryResponse?.success === false) {
              setError(
                mapAuthErrorMessage({
                  flow: "login",
                  rawMessage: retryResponse.error,
                }),
              );
              return;
            }
            if (retryResponse?.redirect) {
              navigateToRedirect(retryResponse.redirect);
            }
            return;
          } catch (retryError) {
            console.error("Login retry failed:", retryError);
          }
        }
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

      // Navigiere immer zu /start (ohne gameId) für sauberen Start
      if (response?.redirect) {
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
