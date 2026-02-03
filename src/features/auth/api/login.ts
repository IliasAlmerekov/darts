import { apiClient } from "@/lib/api";
import { getCsrfToken } from "./csrf";

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

export async function loginWithCredentials(
  credentials: LoginCredentials,
  forceTokenRefresh = false,
): Promise<LoginResponse> {
  const csrfToken = await getCsrfToken("authenticate", forceTokenRefresh);

  const payload = new URLSearchParams();
  payload.set("_username", credentials.email);
  payload.set("_password", credentials.password);
  payload.set("_csrf_token", csrfToken);

  return apiClient.post<LoginResponse>(LOGIN_ENDPOINT, payload.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    skipAuthRedirect: true,
  });
}
