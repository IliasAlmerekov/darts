import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { InvitationError } from "@/shared/api/auth";
import { useAuthenticatedUser } from "@/shared/hooks/useAuthenticatedUser";
import { useLogin } from "./useLogin";
import { resolveLoginDestination } from "./lib/loginDestination";
import { getActiveGameId } from "@/shared/store";
import { mapAuthErrorMessage } from "@/lib/error/auth-error-handling";
import { ROUTES } from "@/lib/router/routes";
import { resolveSafeRedirect } from "@/lib/router/safeRedirect";
import { parseLocationState } from "@/lib/router/locationState";

/** What the login page shows: the login check, the form, or a failed invitation. */
type LoginScreen =
  | { type: "checking" }
  | { type: "form" }
  | { type: "invitation-error"; invitationError: InvitationError };

/**
 * Orchestrates login page state, submission, and redirect logic.
 */
interface LoginPageReturn {
  screen: LoginScreen;
  error: string | null;
  loading: boolean;
  successMessage: string | null;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  goToPlayerProfile: () => void;
}

function isLoginLocationState(s: unknown): s is { from?: string } {
  if (typeof s !== "object" || s === null) {
    return false;
  }
  if ("from" in s) {
    const record = s as Record<string, unknown>;
    return typeof record["from"] === "string";
  }
  return true;
}

export function useLoginPage(): LoginPageReturn {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { login, loading, error: loginError } = useLogin();
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
    screen = { type: "invitation-error", invitationError };
  } else if (checkingLogin || user !== null) {
    screen = { type: "checking" };
  } else {
    screen = { type: "form" };
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const email = String(formData.get("_username") ?? "");
      const password = String(formData.get("_password") ?? "");
      await login(email, password);
    } catch (err) {
      setSubmitError(
        mapAuthErrorMessage({
          flow: "login",
          error: err,
        }),
      );
    }
  };

  const goToPlayerProfile = (): void => {
    navigate(ROUTES.playerProfile);
  };

  useEffect(() => {
    if (user === null || user.invitationError !== undefined) {
      return;
    }

    navigate(resolveLoginDestination(user, { activeGameId: getActiveGameId(), from }));
  }, [user, from, navigate]);

  return {
    screen,
    error: submitError ?? loginError,
    loading,
    successMessage,
    handleSubmit,
    goToPlayerProfile,
  };
}
