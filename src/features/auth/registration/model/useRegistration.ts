import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, API_ENDPOINTS } from "@/shared/api";

interface RegistrationResponse {
  redirect?: string;
  [key: string]: unknown;
}

export function useRegistration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const register = async (username: string, email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<RegistrationResponse>(API_ENDPOINTS.REGISTER, {
        username,
        email,
        plainPassword: password,
      });

      if (response?.redirect) {
        navigate(response.redirect);
      }
    } catch (err) {
      console.error("Logout error:", err);
      setError("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return { register, loading, error };
}
