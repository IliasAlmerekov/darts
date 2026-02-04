import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout as logoutApi } from "../api";

/**
 * Provides logout flow state and action.
 */
export function useLogout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const logout = async (redirectTo: string = "/") => {
    setLoading(true);
    setError(null);

    try {
      await logoutApi();
      navigate(redirectTo);
    } catch (err) {
      console.error("Logout error:", err);
      setError("Logout failed");
    } finally {
      setLoading(false);
    }
  };

  return { logout, loading, error };
}
