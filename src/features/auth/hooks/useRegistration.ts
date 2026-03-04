import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser, type RegistrationResponse } from "../api";
import { mapAuthErrorMessage } from "../lib/error-handling";
import { ApiError } from "@/lib/api";

/**
 * Provides registration flow state and action.
 */
export function useRegistration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const register = async (
    username: string,
    email: string,
    password: string,
  ): Promise<RegistrationResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      let response: RegistrationResponse;
      try {
        response = await registerUser({ username, email, password }, false);
      } catch (firstErr) {
        const isCsrfError =
          firstErr instanceof ApiError &&
          firstErr.status === 422 &&
          typeof firstErr.data === "object" &&
          firstErr.data !== null &&
          "errors" in firstErr.data &&
          typeof (firstErr.data as Record<string, unknown>).errors === "object" &&
          "_csrf_token" in
            ((firstErr.data as Record<string, unknown>).errors as Record<string, unknown>);

        if (!isCsrfError) throw firstErr;

        // Retry with refreshed CSRF token
        response = await registerUser({ username, email, password }, true);
      }

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
