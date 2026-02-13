import { apiClient } from "@/lib/api";

const LOGIN_ENDPOINT = "/login";

export interface LoginResponse {
  redirect?: string;
  success?: boolean;
  error?: string | null;
  last_username?: string | null;
  [key: string]: unknown;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Logs in a user using email/password credentials.
 */
export async function loginWithCredentials(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  const payload = new URLSearchParams();
  payload.set("_username", credentials.email);
  payload.set("_password", credentials.password);

  return apiClient.post<LoginResponse>(LOGIN_ENDPOINT, payload.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    skipAuthRedirect: true,
  });
}
