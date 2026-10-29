import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthenticatedUser } from "@/shared/hooks/useAuthenticatedUser";
import { markInvitationErrorHandled } from "@/shared/query/acceptLoggedInUser";
import { useLogin, type LoginValues } from "./useLogin";
import { resolveLoginDestination } from "./lib/loginDestination";
import { isLoginLocationState } from "./lib/loginLocationState";
import { getActiveGameId } from "@/shared/store";
import { mapInvitationErrorMessage } from "@/lib/error/invitation-error-message";
import { ROUTES } from "@/lib/router/routes";
import { resolveSafeRedirect } from "@/lib/router/safeRedirect";
import { parseLocationState } from "@/lib/router/locationState";

/** What the login page shows: the login check, the form, or a failed invitation. */
type LoginScreen =
  { type: "checking" } | { type: "form" } | { type: "invitation-error"; message: string };

/**
 * Orchestrates login page state, submission, and redirect logic.
 */
interface LoginPageReturn {
  screen: LoginScreen;
  error: string | null;
  loading: boolean;
  successMessage: string | null;
  formAction: (formData: FormData) => void;
  values: LoginValues;
  goToPlayerProfile: () => void;
}

export function useLoginPage(): LoginPageReturn {
  const { formAction, loading, error, values } = useLogin();
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
    error,
    loading,
    successMessage,
    formAction,
    values,
    goToPlayerProfile,
  };
}
