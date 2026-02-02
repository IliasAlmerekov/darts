import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRegistration } from "./useRegistration";

export function useRegistrationPage() {
  const [error, setError] = useState<string | null>(null);
  const { register, loading } = useRegistration();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);

    try {
      const formElement = e.currentTarget;
      const username = (formElement.elements.namedItem("username") as HTMLInputElement).value;
      const email = (formElement.elements.namedItem("email") as HTMLInputElement).value;
      const password = (formElement.elements.namedItem("password") as HTMLInputElement).value;

      const data = await register(username, email, password);
      if (data?.redirect) {
        navigate(data.redirect);
      }
    } catch (err) {
      setError((err as Error).message || "Registration failed");
    }
  };

  return {
    error,
    loading,
    handleSubmit,
  };
}
