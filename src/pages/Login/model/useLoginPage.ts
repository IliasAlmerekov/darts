import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthenticatedUser } from "@/hooks/useAuthenticatedUser";
import { useLogin } from "@/features/auth/login";

export function useLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const { login, loading } = useLogin();
  const navigate = useNavigate();
  const { user, loading: checking } = useAuthenticatedUser();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const username = String(formData.get("_username") ?? "");
      const password = String(formData.get("_password") ?? "");
      await login(username, password);
      // Navigation wird von useLogin übernommen
    } catch (err) {
      setError((err as Error).message || "Login failed");
    }
  };

  // Redirect wenn bereits eingeloggt
  useEffect(() => {
    if (user) {
      const redirectPath = user.redirect?.startsWith("/start/")
        ? "/start" // Bei /start/{gameId} -> zu /start ohne gameId
        : user.redirect || "/start";
      navigate(redirectPath);
    }
  }, [user, navigate]);

  return {
    error,
    loading,
    checking,
    handleSubmit,
  };
}
