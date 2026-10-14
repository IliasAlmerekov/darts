import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/shared/api";
import type { AuthenticatedUser } from "@/shared/api/auth";
import { mapAuthErrorMessage } from "@/lib/error/auth-error-handling";
import { authQueries } from "@/shared/query/auth.queries";

type UseAuthenticatedUserResult = {
  user: AuthenticatedUser | null;
  loading: boolean;
  error: string | null;
};

function getAuthErrorRawMessage(error: unknown): string | undefined {
  return error instanceof ApiError && error.status === 401 ? "unauthorized" : undefined;
}

/**
 * Reads the authenticated user from the query cache and exposes loading/error state.
 */
export const useAuthenticatedUser = (): UseAuthenticatedUserResult => {
  const { data, isPending, error } = useQuery(authQueries.me());

  return {
    user: data ?? null,
    loading: isPending,
    error:
      error === null
        ? null
        : mapAuthErrorMessage({
            flow: "login",
            error,
            rawMessage: getAuthErrorRawMessage(error),
          }),
  };
};
