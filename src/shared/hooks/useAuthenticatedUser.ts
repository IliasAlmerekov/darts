import { useEffect, useState } from "react";
import { setCurrentGameId } from "@/stores/room";

export interface AuthenticatedUser {
  success: boolean;
  roles: string[];
  id: number;
  email?: string | null;
  username?: string | null;
  redirect: string;
  gameId?: number | null;
}

type UseAuthenticatedUserResult = {
  user: AuthenticatedUser | null;
  loading: boolean;
  error: string | null;
};

async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
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

export function useAuthenticatedUser(): UseAuthenticatedUserResult {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
        setLoading(false);
      }
    };

    void fetchUser();
  }, []);

  return { user, loading, error };
}
