// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthenticatedUser } from "./useAuthenticatedUser";
import type { AuthenticatedUser } from "@/shared/api/auth";

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

describe("useAuthenticatedUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aborts request on unmount and skips late store updates", async () => {
    const deferred = createDeferredAuth();
    let capturedSignal: AbortSignal | undefined;

    getAuthenticatedUserMock.mockImplementation((options?: { signal?: AbortSignal }) => {
      capturedSignal = options?.signal;
      return deferred.promise;
    });

    const { unmount } = renderHook(() => useAuthenticatedUser());
    expect(getAuthenticatedUserMock).toHaveBeenCalledTimes(1);

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
});
