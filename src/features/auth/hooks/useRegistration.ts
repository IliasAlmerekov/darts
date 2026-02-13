import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser, type RegistrationResponse } from "../api";
import { mapAuthErrorMessage } from "../lib/error-handling";

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
  ): Promise<RegistrationResponse> => {
    return registerUser({ username, email, password });
  };

  const register = async (
    username: string,
    email: string,
    password: string,
  ): Promise<RegistrationResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await submitRegistration(username, email, password);

      // Navigiere immer zu /start (ohne gameId) für sauberen Start
      if (response?.redirect) {
        const redirectPath = response.redirect === "/start" ? "/start" : response.redirect;
        navigate(redirectPath);
      }
      return response;
    } catch (err) {
      console.error("Registration error:", err);
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
