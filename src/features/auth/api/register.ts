import { apiClient } from "@/lib/api";
import { getCsrfToken } from "./csrf";

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

export async function registerUser(
  data: RegistrationData,
  forceTokenRefresh = false,
): Promise<RegistrationResponse> {
  const csrfToken = await getCsrfToken("user_registration", forceTokenRefresh);

  return apiClient.post<RegistrationResponse>(REGISTER_ENDPOINT, {
    username: data.username,
    email: data.email,
    plainPassword: data.password,
    _csrf_token: csrfToken,
  });
}
