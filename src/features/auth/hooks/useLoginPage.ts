import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthenticatedUser } from "./useAuthenticatedUser";
import { useLogin } from "./useLogin";
import { getActiveGameId } from "@/stores/room";

/**
 * Orchestrates login page state, submission, and redirect logic.
 */
export function useLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const { login, loading, error: loginError } = useLogin();
  const navigate = useNavigate();
  const { user, loading: checking } = useAuthenticatedUser();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const email = String(formData.get("_username") ?? "");
      const password = String(formData.get("_password") ?? "");
      await login(email, password);
      // Navigation wird von useLogin übernommen
    } catch (err) {
      setError((err as Error).message || "Login failed");
    }
  };

  // Redirect wenn bereits eingeloggt
  useEffect(() => {
    if (user) {
      // Check if there's an active game session
      const activeGameId = getActiveGameId();

      if (activeGameId) {
        // Redirect to active game session
        navigate(`/start/${activeGameId}`);
        return;
      }

      const redirectPath = user.redirect?.startsWith("/start/")
        ? "/start" // Bei /start/{gameId} -> zu /start ohne gameId
        : user.redirect || "/start";
      navigate(redirectPath);
    }
  }, [user, navigate]);

  return {
    error: error ?? loginError,
    loading,
    checking,
    handleSubmit,
  };
}
