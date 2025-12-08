import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, API_ENDPOINTS } from "@/shared/api";

interface LoginResponse {
  redirect?: string;
  [key: string]: unknown;
}

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const payload = new URLSearchParams();
      payload.set("_username", username);
      payload.set("_password", password);

      const response = await apiClient.post<LoginResponse>(
        API_ENDPOINTS.LOGIN,
        payload.toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );

      if (response?.redirect) {
        navigate(response.redirect);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Login fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
}
