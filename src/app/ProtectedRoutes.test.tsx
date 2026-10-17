// @vitest-environment jsdom
vi.mock("@/shared/hooks/useAuthenticatedUser");
vi.mock("@/shared/ui/skeletons", () => ({
  StartPageSkeleton: () => <div data-testid="start-page-skeleton" />,
  LoginSuccessSkeleton: () => <div data-testid="login-success-skeleton" />,
  UniversalSkeleton: () => <div data-testid="universal-skeleton" />,
}));

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/shared/api/auth";
import { useAuthenticatedUser } from "@/shared/hooks/useAuthenticatedUser";
import ProtectedRoutes from "./ProtectedRoutes";

const mockUseAuthenticatedUser = vi.mocked(useAuthenticatedUser);

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

function renderProtectedRoutes(initialPath: string): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<ProtectedRoutes allowedRoles={["ROLE_ADMIN"]} />}>
          <Route path="*" element={<div data-testid="outlet-content">Protected Content</div>} />
        </Route>
        <Route path="/" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoutes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should render StartPageSkeleton when loading on a /start route", () => {
    mockUseAuthenticatedUser.mockReturnValue({ user: null, loading: true, error: null });

    renderProtectedRoutes("/start");

    expect(screen.getByTestId("start-page-skeleton")).toBeDefined();
    expect(screen.queryByTestId("login-success-skeleton")).toBeNull();
    expect(screen.queryByTestId("universal-skeleton")).toBeNull();
  });

  it("should render LoginSuccessSkeleton when loading on a /joined route", () => {
    mockUseAuthenticatedUser.mockReturnValue({ user: null, loading: true, error: null });

    renderProtectedRoutes("/joined");

    expect(screen.getByTestId("login-success-skeleton")).toBeDefined();
    expect(screen.queryByTestId("start-page-skeleton")).toBeNull();
    expect(screen.queryByTestId("universal-skeleton")).toBeNull();
  });

  it("should render UniversalSkeleton when loading on an unrelated route", () => {
    mockUseAuthenticatedUser.mockReturnValue({ user: null, loading: true, error: null });

    renderProtectedRoutes("/game/42");

    expect(screen.getByTestId("universal-skeleton")).toBeDefined();
    expect(screen.queryByTestId("start-page-skeleton")).toBeNull();
    expect(screen.queryByTestId("login-success-skeleton")).toBeNull();
  });

  it("should redirect to / when not loading and user is not authenticated", () => {
    mockUseAuthenticatedUser.mockReturnValue({ user: null, loading: false, error: null });

    renderProtectedRoutes("/game/42");

    expect(screen.getByText("Login page")).toBeDefined();
    expect(screen.queryByTestId("outlet-content")).toBeNull();
  });

  it("should redirect player users to the Player profile when they lack admin permissions", () => {
    mockUseAuthenticatedUser.mockReturnValue({
      user: buildAuthenticatedUser({ roles: ["ROLE_PLAYER"] }),
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={["/game/42"]}>
        <Routes>
          <Route element={<ProtectedRoutes allowedRoles={["ROLE_ADMIN"]} />}>
            <Route
              path="/game/42"
              element={<div data-testid="outlet-content">Protected Content</div>}
            />
          </Route>
          <Route path="/joined" element={<div>Waiting room</div>} />
          <Route path="/playerprofile" element={<div>Player profile</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Player profile")).toBeDefined();
    expect(screen.queryByText("Waiting room")).toBeNull();
    expect(screen.queryByTestId("outlet-content")).toBeNull();
  });

  it("should redirect admin users to /start when they lack player permissions", () => {
    mockUseAuthenticatedUser.mockReturnValue({
      user: buildAuthenticatedUser({ roles: ["ROLE_ADMIN"] }),
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={["/joined"]}>
        <Routes>
          <Route element={<ProtectedRoutes allowedRoles={["ROLE_PLAYER"]} />}>
            <Route
              path="/joined"
              element={<div data-testid="outlet-content">Protected Content</div>}
            />
          </Route>
          <Route path="/start" element={<div data-testid="start-page">Start</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("start-page")).toBeDefined();
    expect(screen.queryByTestId("outlet-content")).toBeNull();
  });

  it("should redirect users without a known role to the login page", () => {
    mockUseAuthenticatedUser.mockReturnValue({
      user: buildAuthenticatedUser({ roles: ["ROLE_USER"] }),
      loading: false,
      error: null,
    });

    renderProtectedRoutes("/game/42");

    expect(screen.getByText("Login page")).toBeDefined();
    expect(screen.queryByTestId("outlet-content")).toBeNull();
  });

  it("should render Outlet when user has the required role", () => {
    mockUseAuthenticatedUser.mockReturnValue({
      user: buildAuthenticatedUser({ roles: ["ROLE_ADMIN"] }),
      loading: false,
      error: null,
    });

    renderProtectedRoutes("/game/42");

    expect(screen.getByTestId("outlet-content")).toBeDefined();
    expect(screen.queryByText("Login page")).toBeNull();
  });
});
