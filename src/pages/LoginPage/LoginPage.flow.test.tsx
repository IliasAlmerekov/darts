// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./index";
import { ROUTES } from "@/lib/router/routes";
import { queryClient } from "@/shared/query/queryClient";
import { $currentGameId, setCurrentGameId } from "@/shared/store";

const loginWithCredentialsMock = vi.fn();
const getAuthenticatedUserMock = vi.fn();

vi.mock("@/shared/api/auth", () => ({
  loginWithCredentials: (...args: unknown[]) => loginWithCredentialsMock(...args),
  getAuthenticatedUser: (...args: unknown[]) => getAuthenticatedUserMock(...args),
}));

const loggedInPlayer = {
  success: true,
  roles: ["ROLE_PLAYER"],
  id: 23,
  username: "Ton Eighty",
  redirect: "http://localhost:3000/joined",
};

function renderLoginRoute(): void {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ROUTES.login]}>
        <Routes>
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.joined} element={<h1>Waiting room</h1>} />
          <Route path={ROUTES.playerProfile} element={<h1>Player profile</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function submitLoginForm(): Promise<void> {
  fireEvent.change(await screen.findByLabelText(/email/i), {
    target: { value: "player@test.com" },
  });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "secret" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginPage form login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    setCurrentGameId(null);
    getAuthenticatedUserMock.mockResolvedValue(null);
  });

  it("stores the joined game and opens the Waiting room", async () => {
    loginWithCredentialsMock.mockResolvedValueOnce({
      type: "user",
      user: { ...loggedInPlayer, gameId: 42 },
    });

    renderLoginRoute();
    await submitLoginForm();

    expect(await screen.findByRole("heading", { name: "Waiting room" })).toBeTruthy();
    expect($currentGameId.get()).toBe(42);
  });

  it("shows why the invitation failed and offers the player profile", async () => {
    loginWithCredentialsMock.mockResolvedValueOnce({
      type: "user",
      user: { ...loggedInPlayer, invitationError: "GAME_ALREADY_STARTED" },
    });

    renderLoginRoute();
    await submitLoginForm();

    expect(
      await screen.findByRole("heading", { name: "This game has already started" }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Go to my profile" }));

    expect(await screen.findByRole("heading", { name: "Player profile" })).toBeTruthy();
  });
});
