export interface AuthenticatedUser {
  success: boolean;
  roles: string[];
  id: number;
  email?: string | null;
  username?: string | null;
  redirect: string;
  gameId?: number | null;
}

/**
 * Fetches the currently authenticated user, if any.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const response = await fetch("/api/login/success", {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (response.ok) {
    const data = await response.json();
    if (data.success) {
      return data.user ?? data;
    }
  }

  return null;
}
