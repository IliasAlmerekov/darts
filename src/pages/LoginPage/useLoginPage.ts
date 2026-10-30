import { useActionState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loginWithCredentials } from "@/shared/api/auth";
import { useAuthenticatedUser } from "@/shared/hooks/useAuthenticatedUser";
import { acceptLoggedInUser, markInvitationErrorHandled } from "@/shared/query/acceptLoggedInUser";
import { resolveLoginDestination } from "./lib/loginDestination";
import { isLoginLocationState } from "./lib/loginLocationState";
import { getActiveGameId } from "@/shared/store";
import { mapAuthErrorMessage } from "@/lib/error/auth-error-handling";
import { mapInvitationErrorMessage } from "@/lib/error/invitation-error-message";
import { ROUTES } from "@/lib/router/routes";
import { resolveSafeRedirect } from "@/lib/router/safeRedirect";
import { parseLocationState } from "@/lib/router/locationState";

/** The login fields as submitted. */
export interface LoginValues {
  email: string;
  password: string;
}

/** What the form shows after a submit: the mapped error and the submitted values to keep. */
interface LoginFormState {
  error: string | null;
  values: LoginValues;
}

/** What the login page shows: the login check, the form, or a failed invitation. */
type LoginScreen =
  { type: "checking" } | { type: "form" } | { type: "invitation-error"; message: string };

/**
 * Orchestrates login page state, submission, and redirect logic.
 */
interface UseLoginPageResult {
  screen: LoginScreen;
  error: string | null;
  loading: boolean;
  successMessage: string | null;
  /** The `<form action>` of the login form. */
  formAction: (formData: FormData) => void;
  /** The last submitted values; the form feeds them back as `defaultValue`, because React 19 resets the fields after an action. */
  values: LoginValues;
  goToPlayerProfile: () => void;
}

const INITIAL_STATE: LoginFormState = { error: null, values: { email: "", password: "" } };

/**
 * A successful login puts the user into the auth query, where the login page reads it the
 * same way as after a Remembered login check.
 */
async function submitLogin(_previous: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const email = String(formData.get("_username") ?? "");
  const password = String(formData.get("_password") ?? "");

  try {
    await acceptLoggedInUser(await loginWithCredentials({ email, password }));
    return { error: null, values: { email, password } };
  } catch (error) {
    return { error: mapAuthErrorMessage({ flow: "login", error }), values: { email, password } };
  }
}

export function useLoginPage(): UseLoginPageResult {
  const [state, formAction, loading] = useActionState(submitLogin, INITIAL_STATE);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: checkingLogin } = useAuthenticatedUser();

  const from = resolveSafeRedirect(
    parseLocationState(location.state, isLoginLocationState)?.from,
    ROUTES.start(),
  );

  const successMessage =
    new URLSearchParams(location.search).get("left") === "1"
      ? "You have successfully left the game"
      : null;

  const invitationError = user?.invitationError;

  // A logged-in user without an invitation error is about to leave the page, so the
  // check screen stays up instead of flashing the form.
  let screen: LoginScreen;
  if (invitationError !== undefined) {
    screen = { type: "invitation-error", message: mapInvitationErrorMessage(invitationError) };
  } else if (checkingLogin || user !== null) {
    screen = { type: "checking" };
  } else {
    screen = { type: "form" };
  }

  // The handled error leaves the cached user, so a later visit to the login page redirects
  // instead of showing it again. The redirect effect below then opens the profile.
  // The handled error leaves the cached user, so the redirect effect below opens the profile.
  const goToPlayerProfile = markInvitationErrorHandled;

  useEffect(() => {
    if (user === null || user.invitationError !== undefined) {
      return;
    }

    navigate(resolveLoginDestination(user, { currentGameId: getActiveGameId(), from }));
  }, [user, from, navigate]);

  return {
    screen,
    // The previous error goes away when the next submit starts, as it did before the action state.
    error: loading ? null : state.error,
    loading,
    successMessage,
    formAction,
    values: state.values,
    goToPlayerProfile,
  };
}
