import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser, type RegistrationResponse } from "../api";
import { isCsrfRelatedAuthError, mapAuthErrorMessage } from "../lib/error-handling";

/**
 * Provides registration flow state and action.
 */
export function useRegistration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const submitRegistration = async (
    username: string,
    email: string,
    password: string,
    forceTokenRefresh: boolean,
  ): Promise<RegistrationResponse> => {
    return registerUser({ username, email, password }, forceTokenRefresh);
  };

  const register = async (
    username: string,
    email: string,
    password: string,
  ): Promise<RegistrationResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await submitRegistration(username, email, password, false);

      // Navigiere immer zu /start (ohne gameId) für sauberen Start
      if (response?.redirect) {
        const redirectPath = response.redirect === "/start" ? "/start" : response.redirect;
        navigate(redirectPath);
      }
      return response;
    } catch (err) {
      console.error("Registration error:", err);
      if (isCsrfRelatedAuthError(err)) {
        try {
          const retryResponse = await submitRegistration(username, email, password, true);
          if (retryResponse?.redirect) {
            const redirectPath =
              retryResponse.redirect === "/start" ? "/start" : retryResponse.redirect;
            navigate(redirectPath);
          }
          return retryResponse;
        } catch (retryError) {
          console.error("Registration retry failed:", retryError);
          setError(
            mapAuthErrorMessage({
              flow: "registration",
              error: retryError,
            }),
          );
          return null;
        }
      }

      setError(
        mapAuthErrorMessage({
          flow: "registration",
          error: err,
        }),
      );
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { register, loading, error };
}
