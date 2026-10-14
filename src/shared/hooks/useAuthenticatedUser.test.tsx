// @vitest-environment jsdom
vi.mock("@/shared/api/auth", () => ({
  getAuthenticatedUser: (...args: unknown[]) => getAuthenticatedUserMock(...args),
}));

vi.mock("@/shared/store", () => ({
  setCurrentGameId: (...args: unknown[]) => setCurrentGameIdMock(...args),
}));

vi.mock("@/shared/services/browser/clientLogger", () => ({
  clientLogger: {
    error: vi.fn(),
  },
}));

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, TimeoutError } from "@/shared/api";
import { useAuthenticatedUser } from "./useAuthenticatedUser";
import type { AuthenticatedUser } from "@/shared/api/auth";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { queryClient } from "@/shared/query/queryClient";

const getAuthenticatedUserMock = vi.fn();
const setCurrentGameIdMock = vi.fn();

type DeferredAuth = {
  promise: Promise<AuthenticatedUser | null>;
  resolve: (value: AuthenticatedUser | null) => void;
};

function buildAuthenticatedUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    success: true,
    roles: ["ROLE_USER"],
    id: 1,
    redirect: "/start",
    gameId: null,
    ...overrides,
  };
}

function createDeferredAuth(): DeferredAuth {
  let resolvePromise: (value: AuthenticatedUser | null) => void = () => {};
  const promise = new Promise<AuthenticatedUser | null>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: resolvePromise,
  };
}

function wrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useAuthenticatedUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("should pass a live signal and timeoutMs 5000 when starting auth check", async () => {
    getAuthenticatedUserMock.mockResolvedValue(null);
    const { result } = renderHook(() => useAuthenticatedUser(), { wrapper });

    expect(getAuthenticatedUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        timeoutMs: 5000,
      }),
    );

    const [firstCallOptions] = getAuthenticatedUserMock.mock.calls[0] as [
      { signal?: AbortSignal; timeoutMs?: number },
    ];

    expect(firstCallOptions.signal?.aborted).toBe(false);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it("should abort the request and skip late store updates when the hook unmounts", async () => {
    const deferred = createDeferredAuth();
    let capturedSignal: AbortSignal | undefined;

    getAuthenticatedUserMock.mockImplementation(
      (options?: { signal?: AbortSignal; timeoutMs?: number }) => {
        capturedSignal = options?.signal;
        return deferred.promise;
      },
    );

    const { unmount } = renderHook(() => useAuthenticatedUser(), { wrapper });
    expect(getAuthenticatedUserMock).toHaveBeenCalledTimes(1);
    expect(getAuthenticatedUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        timeoutMs: 5000,
      }),
    );

    unmount();
    expect(capturedSignal?.aborted).toBe(true);

    deferred.resolve(buildAuthenticatedUser({ gameId: 25 }));

    await Promise.resolve();
    await Promise.resolve();

    expect(setCurrentGameIdMock).not.toHaveBeenCalled();
  });

  it("should treat as unauthenticated when the auth bootstrap times out", async () => {
    getAuthenticatedUserMock.mockRejectedValue(
      new TimeoutError("Request timed out after 5000ms", "/api/login/success"),
    );

    const { result } = renderHook(() => useAuthenticatedUser(), { wrapper });

    await waitFor(() => {
      expect(getAuthenticatedUserMock).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should mark auth as unauthenticated when the auth API resolves null", async () => {
    getAuthenticatedUserMock.mockResolvedValue(null);

    const { result } = renderHook(() => useAuthenticatedUser(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should retain a profile-backed authenticated user", async () => {
    getAuthenticatedUserMock.mockResolvedValue(
      buildAuthenticatedUser({
        roles: ["ROLE_PLAYER"],
        id: 23,
        username: "Ton Eighty",
        redirect: "/playerprofile",
        profile: {
          id: 23,
          nickname: "Ton Eighty",
          stats: {
            gamesPlayed: 12,
            scoreAverage: 58.4,
          },
        },
      }),
    );

    const { result } = renderHook(() => useAuthenticatedUser(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toMatchObject({
      roles: ["ROLE_PLAYER"],
      redirect: "/playerprofile",
      profile: {
        nickname: "Ton Eighty",
        stats: {
          gamesPlayed: 12,
          scoreAverage: 58.4,
        },
      },
    });
    expect(result.current.error).toBeNull();
  });

  it("should expose a mapped auth failure when the auth API rejects with authorization failure", async () => {
    getAuthenticatedUserMock.mockRejectedValue(
      new ApiError("Authorization failed for authenticated user", {
        status: 401,
        data: { success: false },
      }),
    );

    const { result } = renderHook(() => useAuthenticatedUser(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.error).toBe("Incorrect email or password.");
  });

  it("should expose a mapped auth failure state when the request fails unexpectedly", async () => {
    const error = new Error("network failed");
    getAuthenticatedUserMock.mockRejectedValue(error);

    const { result } = renderHook(() => useAuthenticatedUser(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.error).toBe("Login failed. Please try again.");
  });

  it("should reuse the cached auth result when the first auth check already succeeded", async () => {
    getAuthenticatedUserMock.mockResolvedValue(
      buildAuthenticatedUser({
        roles: ["ROLE_ADMIN"],
        id: 3,
      }),
    );

    const firstHook = renderHook(() => useAuthenticatedUser(), { wrapper });

    await waitFor(() => {
      expect(firstHook.result.current.loading).toBe(false);
    });

    firstHook.unmount();

    const secondHook = renderHook(() => useAuthenticatedUser(), { wrapper });

    expect(secondHook.result.current.loading).toBe(false);
    expect(secondHook.result.current.user).toMatchObject({ id: 3 });
    expect(getAuthenticatedUserMock).toHaveBeenCalledTimes(1);
  });
});
