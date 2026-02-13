import { API_BASE_URL } from "@/lib/api";

export interface AuthenticatedUser {
  success: boolean;
  roles: string[];
  id: number;
  email?: string | null;
  username?: string | null;
  redirect: string;
  gameId?: number | null;
}

const AUTH_CHECK_TIMEOUT_MS = 8000;

/**
 * Fetches the currently authenticated user, if any.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), AUTH_CHECK_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/login/success`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (response.ok) {
    const data = await response.json();
    if (data.success) {
      return data.user ?? data;
    }
  }

  return null;
}
