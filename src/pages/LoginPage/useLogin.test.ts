// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLogin } from "./useLogin";

const navigateMock = vi.fn();
const loginWithCredentialsMock = vi.fn();
const getAuthenticatedUserMock = vi.fn();
const invalidateAuthStateMock = vi.fn();
const setAuthenticatedUserMock = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/shared/api/auth", () => ({
  loginWithCredentials: (...args: unknown[]) => loginWithCredentialsMock(...args),
  getAuthenticatedUser: (...args: unknown[]) => getAuthenticatedUserMock(...args),
}));

vi.mock("@/store/auth", () => ({
  invalidateAuthState: (...args: unknown[]) => invalidateAuthStateMock(...args),
  setAuthenticatedUser: (...args: unknown[]) => setAuthenticatedUserMock(...args),
}));

describe("useLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navigates when login request fails but authenticated session already exists", async () => {
    loginWithCredentialsMock.mockRejectedValueOnce(new Error("Network request failed"));
    getAuthenticatedUserMock.mockResolvedValueOnce({
      success: true,
      roles: ["ROLE_ADMIN"],
      id: 1,
      redirect: "/start",
    });

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.login("admin@test.com", "password");
    });

    expect(getAuthenticatedUserMock).toHaveBeenCalledTimes(1);
    expect(setAuthenticatedUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, redirect: "/start" }),
    );
    expect(navigateMock).toHaveBeenCalledWith("/start");
    expect(result.current.error).toBeNull();
  });

  it("sets login error when network request fails and no session is available", async () => {
    loginWithCredentialsMock.mockRejectedValueOnce(new Error("Network request failed"));
    getAuthenticatedUserMock.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.login("admin@test.com", "password");
    });

    expect(getAuthenticatedUserMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Network error. Please check your connection and try again.");
  });

  it("invalidates cached auth state before navigating by redirect response", async () => {
    loginWithCredentialsMock.mockResolvedValueOnce({
      success: true,
      redirect: "/start/42",
    });

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.login("admin@test.com", "password");
    });

    expect(invalidateAuthStateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith("/start/42");
    expect(getAuthenticatedUserMock).not.toHaveBeenCalled();
  });
});
