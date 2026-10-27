import { useActionState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser, type RegistrationResponse } from "@/shared/api/auth";
import { mapAuthErrorMessage } from "@/lib/error/auth-error-handling";
import { ApiError } from "@/shared/api";
import { isRecord } from "@/lib/guards/guards";
import { ROUTES } from "@/lib/router/routes";
import { toSafeRedirectPath } from "@/lib/router/safeRedirect";
import { acceptLoggedInUser } from "@/shared/query/acceptLoggedInUser";
import { authQueries } from "@/shared/query/auth.queries";
import { queryClient } from "@/shared/query/queryClient";
import { setCurrentGameId } from "@/shared/store";
import { clientLogger } from "@/shared/services/browser/clientLogger";

/** The registration fields as submitted. */
export interface RegistrationValues {
  username: string;
  email: string;
  password: string;
}

/** What the form shows after a submit: the error, the accepted response, and the submitted values to keep. */
interface RegistrationFormState {
  error: string | null;
  registered: RegistrationResponse | null;
  values: RegistrationValues;
}

/**
 * Provides registration flow state and the form action.
 */
interface RegistrationReturn {
  /** The `<form action>` of the registration form. */
  formAction: (formData: FormData) => void;
  loading: boolean;
  error: string | null;
  /** The accepted registration response; the page decides between joining and the invitation error. */
  registered: RegistrationResponse | null;
  /** The last submitted values; the form feeds them back as `defaultValue`, because React 19 resets the fields after an action. */
  values: RegistrationValues;
}

const INITIAL_STATE: RegistrationFormState = {
  error: null,
  registered: null,
  values: { username: "", email: "", password: "" },
};

function hasErrorsRecord(data: unknown): data is { errors: Record<string, unknown> } {
  return isRecord(data) && "errors" in data && isRecord(data.errors);
}

export function useRegistration(): RegistrationReturn {
  const navigate = useNavigate();

  const submitRegistration = async (
    _previous: RegistrationFormState,
    formData: FormData,
  ): Promise<RegistrationFormState> => {
    const username = String(formData.get("username") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const submitted: RegistrationValues = { username, email, password };

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
      // A session check still running would overwrite the new user with its late answer.
      await queryClient.cancelQueries({ queryKey: authQueries.me().queryKey });
      acceptLoggedInUser(response);

      if (response.invitationError !== undefined) {
        return { values: submitted, error: null, registered: response };
      }

      if (response.redirect) {
        const safeRedirect = toSafeRedirectPath(response.redirect);
        if (safeRedirect === null) {
          // The URL itself stays out of the log: it may carry a token.
          clientLogger.warn("auth.registration.unsafe_redirect");
        }
        navigate(safeRedirect ?? ROUTES.start());
      }
      return { values: submitted, error: null, registered: response };
    } catch (err) {
      clientLogger.error("auth.registration.failed", {
        error: err,
      });
      return {
        values: submitted,
        error: mapAuthErrorMessage({
          flow: "registration",
          error: err,
        }),
        registered: null,
      };
    }
  };

  const [state, formAction, loading] = useActionState(submitRegistration, INITIAL_STATE);

  return {
    formAction,
    loading,
    error: state.error,
    registered: state.registered,
    values: state.values,
  };
}
