import { useActionState } from "react";
import { registerUser } from "@/shared/api/auth";
import { useAuthenticatedUser } from "@/shared/hooks/useAuthenticatedUser";
import { useAuthRedirect } from "@/shared/hooks/useAuthRedirect";
import { mapAuthErrorMessage } from "@/lib/error/auth-error-handling";
import { mapInvitationErrorMessage } from "@/lib/error/invitation-error-message";
import { acceptAuthenticatedUser, dismissInvitationError } from "@/shared/query/postAuth";
import { ROUTES } from "@/lib/router/routes";

/** The registration fields as submitted. */
export interface RegistrationValues {
  username: string;
  email: string;
  password: string;
}

/** What the form shows after a submit: the error, whether the account was created, and the submitted values to keep. */
interface RegistrationFormState {
  error: string | null;
  registered: boolean;
  values: RegistrationValues;
}

/**
 * What the registration page shows: the login check, the form, the joining state after a
 * registration, or a failed invitation.
 */
type RegistrationScreen =
  | { type: "checking" }
  | { type: "form" }
  | { type: "joining" }
  | { type: "invitation-error"; message: string };

/**
 * Orchestrates registration page state and submission handling.
 */
interface UseRegistrationPageResult {
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
  registered: false,
  values: { username: "", email: "", password: "" },
};

/**
 * A successful registration puts the new user into the auth query, where `useAuthRedirect`
 * reads it the same way as after a Remembered login check. `registerUser` logs failures.
 */
async function submitRegistration(
  _previous: RegistrationFormState,
  formData: FormData,
): Promise<RegistrationFormState> {
  const username = String(formData.get("username") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const submitted: RegistrationValues = { username, email, password };

  try {
    await acceptAuthenticatedUser(await registerUser({ username, email, password }));
    return { values: submitted, error: null, registered: true };
  } catch (error) {
    return {
      values: submitted,
      error: mapAuthErrorMessage({ flow: "registration", error }),
      registered: false,
    };
  }
}

export function useRegistrationPage(): UseRegistrationPageResult {
  const [state, formAction, loading] = useActionState(submitRegistration, INITIAL_STATE);
  const { user, loading: checkingLogin } = useAuthenticatedUser();

  useAuthRedirect(ROUTES.start());

  // A user without an invitation error is about to leave the page, so the form does not
  // flash: a user who just registered sees the joining state, a Remembered login the check.
  // The cached user arrives while the submit is still pending, hence `loading`.
  let screen: RegistrationScreen;
  const invitationError = user?.invitationError;
  if (invitationError !== undefined) {
    screen = { type: "invitation-error", message: mapInvitationErrorMessage(invitationError) };
  } else if (user !== null && (loading || state.registered)) {
    screen = { type: "joining" };
  } else if (checkingLogin || user !== null) {
    screen = { type: "checking" };
  } else {
    screen = { type: "form" };
  }

  return {
    screen,
    // The previous error goes away when the next submit starts, as it did before the action state.
    error: loading ? null : state.error,
    loading,
    formAction,
    values: state.values,
    // The handled error leaves the cached user, so `useAuthRedirect` opens the profile.
    goToPlayerProfile: dismissInvitationError,
  };
}
