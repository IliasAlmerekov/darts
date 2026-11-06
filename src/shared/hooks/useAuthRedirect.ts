import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthenticatedUser } from "@/shared/hooks/useAuthenticatedUser";
import { resolveAuthDestination } from "@/shared/query/postAuth";

/**
 * Sends an authenticated user away from the login or registration page. It waits while the
 * cached user carries an invitation error, so the page can show it; `dismissInvitationError`
 * then lets it open the Player profile.
 *
 * @param from The in-app route to return to when the backend sends the user to the start page.
 */
export function useAuthRedirect(from: string): void {
  const navigate = useNavigate();
  const { user } = useAuthenticatedUser();

  useEffect(() => {
    if (user === null || user.invitationError !== undefined) {
      return;
    }

    navigate(resolveAuthDestination(user, from));
  }, [user, from, navigate]);
}
