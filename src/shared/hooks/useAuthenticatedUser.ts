import { useEffect, useState } from "react";
import { setCurrentGameId } from "@/stores/room";
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

type UseAuthenticatedUserResult = {
  user: AuthenticatedUser | null;
  loading: boolean;
  error: string | null;
};

async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
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

export function useAuthenticatedUser(): UseAuthenticatedUserResult {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const safetyTimeoutId = window.setTimeout(() => {
      setLoading(false);
    }, 10000);

    const fetchUser = async () => {
      try {
        const userData = await getAuthenticatedUser();
        if (userData) {
          setUser(userData);
          if (typeof userData.gameId === "number") {
            setCurrentGameId(userData.gameId);
          }
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unknown error");
        }
      } finally {
        window.clearTimeout(safetyTimeoutId);
        setLoading(false);
      }
    };

    void fetchUser();

    return () => {
      window.clearTimeout(safetyTimeoutId);
    };
  }, []);

  return { user, loading, error };
}
