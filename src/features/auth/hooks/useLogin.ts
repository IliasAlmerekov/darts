import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithCredentials, getAuthenticatedUser } from "../api";

/**
 * Provides login flow state and action.
 */
export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await loginWithCredentials({ email, password });

      if (response?.success === false) {
        const message = response.error?.trim() ? response.error : "Login fehlgeschlagen";
        if (message.toLowerCase().includes("csrf")) {
          try {
            const retryResponse = await loginWithCredentials({ email, password }, true);
            if (retryResponse?.success === false) {
              setError(retryResponse.error?.trim() ? retryResponse.error : "Login fehlgeschlagen");
              return;
            }
            if (retryResponse?.redirect) {
              const redirectPath =
                retryResponse.redirect === "/start" ? "/start" : retryResponse.redirect;
              navigate(redirectPath);
            }
            return;
          } catch (retryError) {
            console.error("Login retry failed:", retryError);
          }
        }
        if (!response.error) {
          const authenticatedUser = await getAuthenticatedUser();
          if (authenticatedUser?.redirect) {
            const redirectPath =
              authenticatedUser.redirect === "/start" ? "/start" : authenticatedUser.redirect;
            navigate(redirectPath);
            return;
          }
        }

        setError(message);
        return;
      }

      // Navigiere immer zu /start (ohne gameId) für sauberen Start
      if (response?.redirect) {
        const redirectPath = response.redirect === "/start" ? "/start" : response.redirect;
        navigate(redirectPath);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Login fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
}
