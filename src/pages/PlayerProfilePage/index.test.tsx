// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/shared/api/auth";
import PlayerProfilePage from ".";

const useAuthenticatedUserMock = vi.fn();

vi.mock("@/shared/hooks/useAuthenticatedUser", () => ({
  useAuthenticatedUser: () => useAuthenticatedUserMock(),
}));

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

    render(<PlayerProfilePage />);

    expect(screen.getByRole("heading", { level: 1, name: "Spielerprofil" })).toBeTruthy();
    expect(screen.getByText("Benutzername: Alice")).toBeTruthy();
    expect(screen.getByText("E-Mail: alice@example.com")).toBeTruthy();
    expect(screen.getByText("Rollen: Administrator, Spieler")).toBeTruthy();
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

    render(<PlayerProfilePage />);

    expect(screen.getByText("Benutzername: alice@example.com")).toBeTruthy();
  });

  it("renders the hook error state", () => {
    useAuthenticatedUserMock.mockReturnValue({
      user: null,
      loading: false,
      error: "Profil konnte nicht geladen werden",
    });

    render(<PlayerProfilePage />);

    expect(screen.getByText("Fehler: Profil konnte nicht geladen werden")).toBeTruthy();
  });
});
