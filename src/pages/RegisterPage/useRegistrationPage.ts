import { FormEvent } from "react";
import { useRegistration } from "./useRegistration";

/**
 * Orchestrates registration page state and submission handling.
 */
interface RegistrationPageReturn {
  error: string | null;
  loading: boolean;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function useRegistrationPage(): RegistrationPageReturn {
  const { register, loading, error } = useRegistration();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    const formElement = e.currentTarget;
    const usernameInput = formElement.elements.namedItem("username");
    const emailInput = formElement.elements.namedItem("email");
    const passwordInput = formElement.elements.namedItem("password");

    if (
      !(usernameInput instanceof HTMLInputElement) ||
      !(emailInput instanceof HTMLInputElement) ||
      !(passwordInput instanceof HTMLInputElement)
    ) {
      return;
    }

    await register(usernameInput.value, emailInput.value, passwordInput.value);
  };

  return {
    error,
    loading,
    handleSubmit,
  };
}
