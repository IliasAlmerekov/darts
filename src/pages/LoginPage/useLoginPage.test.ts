// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLoginPage } from "./useLoginPage";
import { ROUTES } from "@/lib/router/routes";

const navigateMock = vi.fn();
const useLoginMock = vi.fn();
const useAuthenticatedUserMock = vi.fn();
const getActiveGameIdMock = vi.fn();
const useLocationMock = vi.fn();
const assignMock = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => useLocationMock(),
  };
});

vi.mock("./useLogin", () => ({
  useLogin: () => useLoginMock(),
}));

vi.mock("@/shared/hooks/useAuthenticatedUser", () => ({
  useAuthenticatedUser: () => useAuthenticatedUserMock(),
}));

vi.mock("@/shared/store", () => ({
  getActiveGameId: () => getActiveGameIdMock(),
}));

describe("useLoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        assign: assignMock,
      },
    });
    useLoginMock.mockReturnValue({
      login: vi.fn(),
      loading: false,
      error: null,
    });
    useAuthenticatedUserMock.mockReturnValue({
      user: null,
      loading: false,
      error: null,
    });
    getActiveGameIdMock.mockReturnValue(null);
    useLocationMock.mockReturnValue({
      pathname: "/login",
      search: "",
      hash: "",
      key: "test",
      state: null,
    });
  });

  it("redirects authenticated users to the generic start route from a game-specific start redirect", async () => {
    useAuthenticatedUserMock.mockReturnValue({
      user: {
        success: true,
        roles: ["ROLE_ADMIN"],
        id: 1,
        redirect: "/start/42",
      },
      loading: false,
      error: null,
    });

    renderHook(() => useLoginPage());

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/start");
    });
  });

  it("prefers the cached active game route when one exists", async () => {
    useAuthenticatedUserMock.mockReturnValue({
      user: {
        success: true,
        roles: ["ROLE_ADMIN"],
        id: 1,
        redirect: "/start",
      },
      loading: false,
      error: null,
    });
    getActiveGameIdMock.mockReturnValue(99);

    renderHook(() => useLoginPage());

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/start/99");
    });
  });

  it("falls back to the internal start route when the authenticated user has an external redirect", async () => {
    useAuthenticatedUserMock.mockReturnValue({
      user: {
        success: true,
        roles: ["ROLE_ADMIN"],
        id: 1,
        redirect: "https://evil.example/phishing",
      },
      loading: false,
      error: null,
    });

    renderHook(() => useLoginPage());

    await waitFor(() => {
      expect(assignMock).not.toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith(ROUTES.start());
    });
  });

  it("should not expose checking in return value", () => {
    const { result } = renderHook(() => useLoginPage());
    expect(result.current).not.toHaveProperty("checking");
  });
});
