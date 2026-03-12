import { useState } from "react";
import { useRegistration } from "./useRegistration";
import { mapAuthErrorMessage } from "@/lib/auth-error-handling";

/**
 * Orchestrates registration page state and submission handling.
 */
interface RegistrationPageReturn {
  error: string | null;
  loading: boolean;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export function useRegistrationPage(): RegistrationPageReturn {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { register, loading, error: registrationError } = useRegistration();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitError(null);

    try {
      const formElement = e.currentTarget;
      const username = (formElement.elements.namedItem("username") as HTMLInputElement).value;
      const email = (formElement.elements.namedItem("email") as HTMLInputElement).value;
      const password = (formElement.elements.namedItem("password") as HTMLInputElement).value;

      await register(username, email, password);
    } catch (err) {
      setSubmitError(
        mapAuthErrorMessage({
          flow: "registration",
          error: err,
        }),
      );
    }
  };

  return {
    error: submitError ?? registrationError,
    loading,
    handleSubmit,
  };
}
