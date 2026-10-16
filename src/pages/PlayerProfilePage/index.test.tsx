// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logout, type AuthenticatedUser } from "@/shared/api/auth";
import { NetworkError } from "@/shared/api";
import { ROUTES } from "@/lib/router/routes";

const useAuthenticatedUserMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/hooks/useAuthenticatedUser", () => ({
  useAuthenticatedUser: () => useAuthenticatedUserMock(),
}));

vi.mock("@/shared/api/auth", () => ({
  logout: vi.fn(),
}));

vi.mock("@/shared/services/browser/clientLogger", () => ({
  clientLogger: { error: vi.fn() },
}));

import PlayerProfilePage from ".";

function renderPage(): void {
  const router = createMemoryRouter(
    [
      { path: ROUTES.login, element: <p>Login form</p> },
      { path: ROUTES.playerProfile, element: <PlayerProfilePage /> },
    ],
    { initialEntries: [ROUTES.playerProfile] },
  );
  render(<RouterProvider router={router} />);
}

function createUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    success: true,
    id: 42,
    roles: ["ROLE_ADMIN", "ROLE_PLAYER"],
    email: "alice@example.com",
    username: "Alice",
    redirect: "/profile",
    ...overrides,
  };
}

describe("PlayerProfilePage", () => {
  beforeEach(() => {
    vi.mocked(logout).mockReset();
    useAuthenticatedUserMock.mockReset();
    useAuthenticatedUserMock.mockReturnValue({
      user: null,
      loading: false,
      error: null,
    });
  });

  it("renders user data without raw debug output", () => {
    useAuthenticatedUserMock.mockReturnValue({
      user: createUser(),
      loading: false,
      error: null,
    });

    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Spielerprofil" })).toBeTruthy();
    const identitySection = screen.getByRole("region", { name: "Identität" });
    expect(within(identitySection).getByText("Benutzername: Alice")).toBeTruthy();
    expect(within(identitySection).getByText("E-Mail: alice@example.com")).toBeTruthy();
    const rolesSection = screen.getByRole("region", { name: "Rollen" });
    expect(within(rolesSection).getByText("Rollen: Administrator, Spieler")).toBeTruthy();
    expect(
      screen.queryByText(
        'Benutzername: {"success":true,"id":42,"roles":["ROLE_ADMIN","ROLE_PLAYER"],"email":"alice@example.com","username":"Alice","redirect":"/profile"}',
      ),
    ).toBeNull();
    expect(screen.queryByText("ID: 42")).toBeNull();
    expect(screen.queryByText(/ROLE_ADMIN/)).toBeNull();
  });

  it("falls back to the user email when username is missing", () => {
    useAuthenticatedUserMock.mockReturnValue({
      user: createUser({ username: null }),
      loading: false,
      error: null,
    });

    renderPage();

    const identitySection = screen.getByRole("region", { name: "Identität" });
    expect(within(identitySection).getByText("Benutzername: alice@example.com")).toBeTruthy();
  });

  it("renders nickname for profile-backed authenticated users", () => {
    useAuthenticatedUserMock.mockReturnValue({
      user: createUser({
        username: null,
        profile: {
          id: 42,
          nickname: "Captain Double",
          stats: {
            gamesPlayed: 18,
            scoreAverage: 56.4,
          },
        },
      }),
      loading: false,
      error: null,
    });

    renderPage();

    const identitySection = screen.getByRole("region", { name: "Identität" });
    expect(within(identitySection).getByText("Benutzername: Captain Double")).toBeTruthy();
  });

  it("renders games played for profile-backed authenticated users", () => {
    useAuthenticatedUserMock.mockReturnValue({
      user: createUser({
        profile: {
          id: 42,
          nickname: "Captain Double",
          stats: {
            gamesPlayed: 18,
            scoreAverage: 56.4,
          },
        },
      }),
      loading: false,
      error: null,
    });

    renderPage();

    const statsSection = screen.getByRole("region", { name: "Statistiken" });
    expect(within(statsSection).getByText("Spiele gespielt: 18")).toBeTruthy();
  });

  it("renders score average for profile-backed authenticated users", () => {
    useAuthenticatedUserMock.mockReturnValue({
      user: createUser({
        profile: {
          id: 42,
          nickname: "Captain Double",
          stats: {
            gamesPlayed: 18,
            scoreAverage: 56.4,
          },
        },
      }),
      loading: false,
      error: null,
    });

    renderPage();

    const statsSection = screen.getByRole("region", { name: "Statistiken" });
    expect(within(statsSection).getByText("Durchschnittspunktzahl: 56.4")).toBeTruthy();
  });

  it("renders structured identity, stats, and roles sections for profile users", () => {
    useAuthenticatedUserMock.mockReturnValue({
      user: createUser({
        profile: {
          id: 42,
          nickname: "Captain Double",
          stats: {
            gamesPlayed: 18,
            scoreAverage: 56.4,
          },
        },
      }),
      loading: false,
      error: null,
    });

    renderPage();

    expect(screen.getByRole("region", { name: "Identität" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Statistiken" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Rollen" })).toBeTruthy();
  });

  it("renders the hook error state", () => {
    useAuthenticatedUserMock.mockReturnValue({
      user: null,
      loading: false,
      error: "Profil konnte nicht geladen werden",
    });

    renderPage();

    expect(screen.getByText("Fehler: Profil konnte nicht geladen werden")).toBeTruthy();
  });

  it("opens the login page when the player logs out", async () => {
    vi.mocked(logout).mockResolvedValueOnce(undefined);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByText("Login form")).toBeTruthy();
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("keeps the profile with an error and logs out on Retry when logout fails", async () => {
    vi.mocked(logout)
      .mockRejectedValueOnce(new NetworkError("Failed to fetch"))
      .mockResolvedValueOnce(undefined);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Spielerprofil" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Login form")).toBeTruthy();
    expect(logout).toHaveBeenCalledTimes(2);
  });
});
