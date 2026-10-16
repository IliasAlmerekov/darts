import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "@/shared/api/auth";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import { ROUTES } from "@/lib/router/routes";
import { clientLogger } from "@/shared/services/browser/clientLogger";

const LOGOUT_FAILED_MESSAGE = "Could not log out. Please try again.";

interface UseLogoutReturn {
  isPending: boolean;
  errorMessage: string | null;
  logOut: () => void;
}

/**
 * Ends the Remembered login on this device and opens the login page. A failed request
 * keeps the page and its state, so the player can retry.
 */
export function useLogout(): UseLogoutReturn {
  const navigate = useNavigate();
  const isPendingRef = useRef(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const logOut = useCallback((): void => {
    if (isPendingRef.current) {
      return;
    }

    isPendingRef.current = true;
    setIsPending(true);
    setErrorMessage(null);

    void (async (): Promise<void> => {
      try {
        await logout();
        navigate(ROUTES.login, { replace: true });
      } catch (error) {
        clientLogger.error("auth.logout.failed", { error });
        setErrorMessage(toUserErrorMessage(error, LOGOUT_FAILED_MESSAGE));
      } finally {
        isPendingRef.current = false;
        setIsPending(false);
      }
    })();
  }, [navigate]);

  return { isPending, errorMessage, logOut };
}
