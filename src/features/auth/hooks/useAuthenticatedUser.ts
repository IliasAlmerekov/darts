import { useEffect, useState } from "react";
import { getAuthenticatedUser, type AuthenticatedUser } from "../api";
import { setCurrentGameId } from "@/stores/room";

type UseAuthenticatedUserResult = {
  user: AuthenticatedUser | null;
  loading: boolean;
  error: string | null;
};

/**
 * Fetches the currently authenticated user and exposes loading/error state.
 */
export const useAuthenticatedUser = (): UseAuthenticatedUserResult => {
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
};
