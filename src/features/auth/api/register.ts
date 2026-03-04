import { apiClient } from "@/lib/api";

const REGISTER_ENDPOINT = "/register";

export interface RegistrationResponse {
  redirect?: string;
  [key: string]: unknown;
}

export interface RegistrationData {
  username: string;
  email: string;
  password: string;
}

/**
 * Registers a new user account.
 * @param refreshCsrf - when true, signals the client to fetch a fresh CSRF token before posting
 */
export async function registerUser(
  data: RegistrationData,
  refreshCsrf = false,
): Promise<RegistrationResponse> {
  if (refreshCsrf) {
    // Re-fetch CSRF token by hitting the form page before submitting
    try {
      await fetch(REGISTER_ENDPOINT, { method: "GET", credentials: "include" });
    } catch {
      // Ignore prefetch errors; proceed with registration attempt
    }
  }

  return apiClient.post<RegistrationResponse>(REGISTER_ENDPOINT, {
    username: data.username,
    email: data.email,
    plainPassword: data.password,
  });
}
