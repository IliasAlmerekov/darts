import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser, type RegistrationResponse } from "@/shared/api/auth";
import { mapAuthErrorMessage } from "@/lib/error/auth-error-handling";
import { ApiError } from "@/shared/api";
import { isRecord } from "@/lib/guards/guards";
import { clientLogger } from "@/shared/services/browser/clientLogger";

/**
 * Provides registration flow state and action.
 */
interface RegistrationReturn {
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<RegistrationResponse | null>;
  loading: boolean;
  error: string | null;
}

function hasErrorsRecord(data: unknown): data is { errors: Record<string, unknown> } {
  return isRecord(data) && "errors" in data && isRecord(data.errors);
}

export function useRegistration(): RegistrationReturn {
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
          hasErrorsRecord(firstErr.data) &&
          "_csrf_token" in firstErr.data.errors;

        if (!isCsrfError) throw firstErr;

        response = await registerUser({ username, email, password }, true);
      }

      if (response?.redirect) {
        navigate(response.redirect);
      }
      return response;
    } catch (err) {
      clientLogger.error("auth.registration.failed", {
        error: err,
      });
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
