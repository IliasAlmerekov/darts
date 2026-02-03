import { apiClient } from "@/lib/api";

const LOGOUT_ENDPOINT = "/logout";

export async function logout(): Promise<void> {
  return apiClient.post(LOGOUT_ENDPOINT);
}
