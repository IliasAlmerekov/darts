import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthenticatedUser } from "@/shared/hooks/useAuthenticatedUser";
import { useLogin } from "./useLogin";
import { getActiveGameId } from "@/store";
import { mapAuthErrorMessage } from "@/lib/auth-error-handling";

/**
 * Orchestrates login page state, submission, and redirect logic.
 */
export function useLoginPage() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { login, loading, error: loginError } = useLogin();
  const navigate = useNavigate();
  const { user, loading: checking } = useAuthenticatedUser();

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

  useEffect(() => {
    if (user) {
      const activeGameId = getActiveGameId();

      if (activeGameId) {
        navigate(`/start/${activeGameId}`);
        return;
      }

      const redirectPath = user.redirect?.startsWith("/start/")
        ? "/start"
        : user.redirect || "/start";

      if (/^https?:\/\//i.test(redirectPath)) {
        window.location.assign(redirectPath);
        return;
      }

      navigate(redirectPath);
    }
  }, [user, navigate]);

  return {
    error: submitError ?? loginError,
    loading,
    checking,
    handleSubmit,
  };
}
