import { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useRegistration } from "./useRegistration";
import { useAuthenticatedUser } from "@/shared/hooks/useAuthenticatedUser";
import { mapInvitationErrorMessage } from "@/lib/error/auth-error-handling";
import { markInvitationErrorHandled } from "@/shared/query/acceptLoggedInUser";
import { ROUTES } from "@/lib/router/routes";

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
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  goToPlayerProfile: () => void;
}

export function useRegistrationPage(): RegistrationPageReturn {
  const { register, loading, error, registered } = useRegistration();
  const { user } = useAuthenticatedUser();
  const navigate = useNavigate();

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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    const formElement = e.currentTarget;
    const usernameInput = formElement.elements.namedItem("username");
    const emailInput = formElement.elements.namedItem("email");
    const passwordInput = formElement.elements.namedItem("password");

    if (
      !(usernameInput instanceof HTMLInputElement) ||
      !(emailInput instanceof HTMLInputElement) ||
      !(passwordInput instanceof HTMLInputElement)
    ) {
      return;
    }

    await register(usernameInput.value, emailInput.value, passwordInput.value);
  };

  return {
    screen,
    error,
    loading,
    handleSubmit,
    goToPlayerProfile,
  };
}
