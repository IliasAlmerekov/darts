import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function useRegistrationPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formElement = e.currentTarget;
      const username = (formElement.elements.namedItem("username") as HTMLInputElement).value;
      const email = (formElement.elements.namedItem("email") as HTMLInputElement).value;
      const password = (formElement.elements.namedItem("password") as HTMLInputElement).value;

      const response = await fetch(`/api/register`, {
        method: "POST",
        credentials: "include",
        headers: {
          contentType: "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          plainPassword: password,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          throw new Error(json.message || "Registration failed");
        } catch (error) {
          console.error("Error parsing registration error response:", error);
        }
      }

      const data = await response.json();
      console.log("Registration successful:", data);
      if (data.redirect) {
        navigate(data.redirect);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return {
    error,
    loading,
    handleSubmit,
  };
}
