import { useNavigate } from "react-router-dom";
import { useRegistration, type RegistrationValues } from "./useRegistration";
import { useAuthenticatedUser } from "@/shared/hooks/useAuthenticatedUser";
import { mapInvitationErrorMessage } from "@/lib/error/invitation-error-message";
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
  formAction: (formData: FormData) => void;
  values: RegistrationValues;
  goToPlayerProfile: () => void;
}

export function useRegistrationPage(): RegistrationPageReturn {
  const { formAction, loading, error, registered, values } = useRegistration();
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

  return {
    screen,
    error,
    loading,
    formAction,
    values,
    goToPlayerProfile,
  };
}
