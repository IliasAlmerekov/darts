// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLogin } from "./useLogin";
import { ApiError } from "@/shared/api";
import { ROUTES } from "@/lib/router/routes";

const navigateMock = vi.fn();
const useLocationMock = vi.fn();
const loginWithCredentialsMock = vi.fn();
const getAuthenticatedUserMock = vi.fn();
const invalidateAuthStateMock = vi.fn();
const setAuthenticatedUserMock = vi.fn();
const assignMock = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => useLocationMock(),
  };
});

vi.mock("@/shared/api/auth", () => ({
  loginWithCredentials: (...args: unknown[]) => loginWithCredentialsMock(...args),
  getAuthenticatedUser: (...args: unknown[]) => getAuthenticatedUserMock(...args),
}));

vi.mock("@/shared/store/auth", () => ({
  invalidateAuthState: (...args: unknown[]) => invalidateAuthStateMock(...args),
  setAuthenticatedUser: (...args: unknown[]) => setAuthenticatedUserMock(...args),
}));

describe("useLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        assign: assignMock,
      },
    });
    useLocationMock.mockReturnValue({
      pathname: "/",
      search: "",
      hash: "",
      key: "test",
      state: null,
    });
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

  it("preserves invite source redirects after a successful login redirect", async () => {
    useLocationMock.mockReturnValue({
      pathname: "/",
      search: "",
      hash: "",
      key: "test",
      state: { from: ROUTES.joined },
    });
    loginWithCredentialsMock.mockResolvedValueOnce({
      success: true,
      redirect: "/start",
    });

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.login("player@test.com", "password");
    });

    expect(invalidateAuthStateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith(ROUTES.joined);
    expect(getAuthenticatedUserMock).not.toHaveBeenCalled();
  });

  it("stores a profile-backed user and navigates to the player profile after an API redirect", async () => {
    const profileBackedUser = {
      success: true,
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
    };
    loginWithCredentialsMock.mockResolvedValueOnce({
      success: true,
      redirect: "/api/login/success",
    });
    getAuthenticatedUserMock.mockResolvedValueOnce(profileBackedUser);

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.login("player@test.com", "password");
    });

    expect(getAuthenticatedUserMock).toHaveBeenCalledTimes(1);
    expect(setAuthenticatedUserMock).toHaveBeenCalledWith(profileBackedUser);
    expect(invalidateAuthStateMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/playerprofile");
    expect(result.current.error).toBeNull();
  });

  it("maps direct unsuccessful login responses without exposing the raw message", async () => {
    loginWithCredentialsMock.mockResolvedValueOnce({
      success: false,
      error: "unauthorized",
    });

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.login("player@test.com", "password");
    });

    expect(getAuthenticatedUserMock).not.toHaveBeenCalled();
    expect(setAuthenticatedUserMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Incorrect email or password.");
  });

  it("maps authorization failures from login-success without exposing the raw error", async () => {
    loginWithCredentialsMock.mockResolvedValueOnce({
      success: true,
      redirect: "/api/login/success",
    });
    getAuthenticatedUserMock.mockRejectedValueOnce(
      new ApiError("Authorization failed for authenticated user", {
        status: 401,
        data: { success: false },
      }),
    );

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.login("player@test.com", "password");
    });

    expect(getAuthenticatedUserMock).toHaveBeenCalledTimes(1);
    expect(setAuthenticatedUserMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Incorrect email or password.");
  });

  it("redirects to the protected source route after a successful login redirect", async () => {
    useLocationMock.mockReturnValue({
      pathname: "/",
      search: "",
      hash: "",
      key: "test",
      state: { from: "/statistics" },
    });
    loginWithCredentialsMock.mockResolvedValueOnce({
      success: true,
      redirect: "/start",
    });

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.login("admin@test.com", "password");
    });

    expect(invalidateAuthStateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith("/statistics");
  });

  it("falls back to the internal start route when login returns an external redirect", async () => {
    loginWithCredentialsMock.mockResolvedValueOnce({
      success: true,
      redirect: "https://evil.example/phishing",
    });

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.login("admin@test.com", "password");
    });

    expect(invalidateAuthStateMock).toHaveBeenCalledTimes(1);
    expect(assignMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith(ROUTES.start());
  });
});
