// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthenticatedUser } from "./useAuthenticatedUser";
import type { AuthenticatedUser } from "@/shared/api/auth";
import { resetAuthStore } from "@/store/auth";

const getAuthenticatedUserMock = vi.fn();
const setCurrentGameIdMock = vi.fn();

vi.mock("@/shared/api/auth", () => ({
  getAuthenticatedUser: (...args: unknown[]) => getAuthenticatedUserMock(...args),
}));

vi.mock("@/store", () => ({
  setCurrentGameId: (...args: unknown[]) => setCurrentGameIdMock(...args),
}));

type DeferredAuth = {
  promise: Promise<AuthenticatedUser | null>;
  resolve: (value: AuthenticatedUser | null) => void;
};

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

function createAbortError(): Error {
  return Object.assign(new Error("aborted"), { name: "AbortError" });
}

describe("useAuthenticatedUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAuthStore();
  });

  it("passes a live signal and timeoutMs 5000 when starting auth check", async () => {
    getAuthenticatedUserMock.mockResolvedValue(null);
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");
    const { result } = renderHook(() => useAuthenticatedUser());

    try {
      expect(setTimeoutSpy).not.toHaveBeenCalled();
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
    } finally {
      setTimeoutSpy.mockRestore();
    }

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it("aborts request on unmount and skips late store updates", async () => {
    const deferred = createDeferredAuth();
    let capturedSignal: AbortSignal | undefined;

    getAuthenticatedUserMock.mockImplementation(
      (options?: { signal?: AbortSignal; timeoutMs?: number }) => {
        capturedSignal = options?.signal;
        return deferred.promise;
      },
    );

    const { unmount } = renderHook(() => useAuthenticatedUser());
    expect(getAuthenticatedUserMock).toHaveBeenCalledTimes(1);
    expect(getAuthenticatedUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        timeoutMs: 5000,
      }),
    );

    unmount();
    expect(capturedSignal?.aborted).toBe(true);

    deferred.resolve({
      success: true,
      roles: ["ROLE_USER"],
      id: 1,
      redirect: "/start",
      gameId: 25,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(setCurrentGameIdMock).not.toHaveBeenCalled();
  });

  it("stops loading without surfacing an error after an abort-like rejection", async () => {
    getAuthenticatedUserMock.mockRejectedValue(createAbortError());

    const { result } = renderHook(() => useAuthenticatedUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("reuses cached auth result after the first successful check", async () => {
    getAuthenticatedUserMock.mockResolvedValue({
      success: true,
      roles: ["ROLE_ADMIN"],
      id: 3,
      redirect: "/start",
    });

    const firstHook = renderHook(() => useAuthenticatedUser());

    await waitFor(() => {
      expect(firstHook.result.current.loading).toBe(false);
    });

    firstHook.unmount();

    const secondHook = renderHook(() => useAuthenticatedUser());

    expect(secondHook.result.current.loading).toBe(false);
    expect(secondHook.result.current.user).toMatchObject({ id: 3 });
    expect(getAuthenticatedUserMock).toHaveBeenCalledTimes(1);
  });
});
