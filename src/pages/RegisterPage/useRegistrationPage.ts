import { useActionState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser, type RegistrationResponse } from "@/shared/api/auth";
import { useAuthenticatedUser } from "@/shared/hooks/useAuthenticatedUser";
import { mapAuthErrorMessage } from "@/lib/error/auth-error-handling";
import { mapInvitationErrorMessage } from "@/lib/error/invitation-error-message";
import { acceptLoggedInUser, markInvitationErrorHandled } from "@/shared/query/acceptLoggedInUser";
import { ROUTES } from "@/lib/router/routes";
import { toSafeRedirectPath } from "@/lib/router/safeRedirect";
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

/** What the registration page shows: the form, the joining state, or a failed invitation. */
type RegistrationScreen =
  { type: "form" } | { type: "joining" } | { type: "invitation-error"; message: string };

/**
 * Orchestrates registration page state and submission handling.
 */
interface RegistrationPageReturn {
  screen: RegistrationScreen;
  error: string | null;
  loading: boolean;
  /** The `<form action>` of the registration form. */
  formAction: (formData: FormData) => void;
  /** The last submitted values; the form feeds them back as `defaultValue`, because React 19 resets the fields after an action. */
  values: RegistrationValues;
  goToPlayerProfile: () => void;
}

const INITIAL_STATE: RegistrationFormState = {
  error: null,
  registered: null,
  values: { username: "", email: "", password: "" },
};

export function useRegistrationPage(): RegistrationPageReturn {
  const { user } = useAuthenticatedUser();
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
      const response = await registerUser({ username, email, password });

      // A game id from an earlier session must not leak into the new account.
      if (typeof response.gameId !== "number") {
        setCurrentGameId(null);
      }
      await acceptLoggedInUser(response);

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
  const { registered } = state;

  // A registered player without an invitation error is about to leave the page.
  let screen: RegistrationScreen;
  // After a reload the session user still carries the invitation error.
  const invitationError = (registered ?? user)?.invitationError;
  if (invitationError !== undefined) {
    screen = { type: "invitation-error", message: mapInvitationErrorMessage(invitationError) };
  } else if (registered !== null) {
    screen = { type: "joining" };
  } else {
    screen = { type: "form" };
  }

  const goToPlayerProfile = (): void => {
    markInvitationErrorHandled();
    navigate(ROUTES.playerProfile);
  };

  return {
    screen,
    // The previous error goes away when the next submit starts, as it did before the action state.
    error: loading ? null : state.error,
    loading,
    formAction,
    values: state.values,
    goToPlayerProfile,
  };
}
