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
 */
export async function registerUser(
  data: RegistrationData,
): Promise<RegistrationResponse> {
  return apiClient.post<RegistrationResponse>(REGISTER_ENDPOINT, {
    username: data.username,
    email: data.email,
    plainPassword: data.password,
  });
}
