import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, API_ENDPOINTS } from "@/shared/api";

export function useLogout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const logout = async (redirectTo: string = "/") => {
    setLoading(true);
    setError(null);

    try {
      await apiClient.post(API_ENDPOINTS.LOGOUT);
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
