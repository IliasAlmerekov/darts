import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser, type RegistrationResponse } from "@/shared/api/auth";
import { mapAuthErrorMessage } from "@/lib/error/auth-error-handling";
import { ApiError } from "@/shared/api";
import { isRecord } from "@/lib/guards/guards";
import { ROUTES } from "@/lib/router/routes";
import { toSafeRedirectPath } from "@/lib/router/safeRedirect";
import { acceptLoggedInUser } from "@/shared/query/acceptLoggedInUser";
import { setCurrentGameId } from "@/shared/store";
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
  /** The accepted registration response; the page decides between joining and the invitation error. */
  registered: RegistrationResponse | null;
}

function hasErrorsRecord(data: unknown): data is { errors: Record<string, unknown> } {
  return isRecord(data) && "errors" in data && isRecord(data.errors);
}

export function useRegistration(): RegistrationReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState<RegistrationResponse | null>(null);
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

      // A game id from an earlier session must not leak into the new account.
      if (typeof response.gameId !== "number") {
        setCurrentGameId(null);
      }
      acceptLoggedInUser(response);
      setRegistered(response);

      if (response.invitationError !== undefined) {
        return response;
      }

      if (response.redirect) {
        const safeRedirect = toSafeRedirectPath(response.redirect);
        if (safeRedirect === null) {
          // The URL itself stays out of the log: it may carry a token.
          clientLogger.warn("auth.registration.unsafe_redirect");
        }
        navigate(safeRedirect ?? ROUTES.start());
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

  return { register, loading, error, registered };
}
