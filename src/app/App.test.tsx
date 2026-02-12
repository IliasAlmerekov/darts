// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { Outlet } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("@/features/game", () => ({
  Game: () => <div>Game Page</div>,
}));

vi.mock("@/features/statistics", () => ({
  GameDetailPage: () => <div>Game Details</div>,
  GamesOverview: () => <div>Games Overview</div>,
  Statistics: () => <div>Statistics Page</div>,
}));

vi.mock("@/features/settings", () => ({
  Settings: () => <div>Settings Page</div>,
}));

vi.mock("@/features/player", () => ({
  PlayerProfile: () => <div>Player Profile</div>,
}));

vi.mock("@/features/auth", () => ({
  ProtectedRoutes: () => <Outlet />,
  LoginPage: () => <h1>Login Page</h1>,
  RegistrationPage: () => <div>Registration Page</div>,
}));

vi.mock("@/features/start", () => ({
  StartPage: () => <div>Start Page</div>,
}));

vi.mock("@/features/joined-game", () => ({
  JoinedGamePage: () => <div>Joined Game Page</div>,
}));

vi.mock("@/features/game-summary", () => ({
  GameSummaryPage: () => <div>Game Summary</div>,
}));

describe("App routing", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("renders 404 page for unknown routes", async () => {
    window.history.pushState({}, "", "/unknown-route");

    render(<App />);

    expect(await screen.findByText("Page not found")).toBeDefined();
  });
});
