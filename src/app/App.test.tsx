// @vitest-environment jsdom
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { Outlet } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/ErrorBoundary", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/app/ScrollToTop", () => ({
  default: () => null,
}));

vi.mock("@/app/routes/NotFoundPage", () => ({
  default: () => <h1>Page not found</h1>,
}));

vi.mock("@/app/ProtectedRoutes", () => ({
  default: () => <Outlet />,
}));

vi.mock("@/pages/LoginPage", () => ({
  default: () => <h1>You have successfully left the game</h1>,
}));

vi.mock("@/pages/RegisterPage", () => ({
  default: () => <h1>Create an account</h1>,
}));

vi.mock("@/pages/StartPage", () => ({
  default: () => <div>Start Page</div>,
}));

vi.mock("@/pages/GamePage", () => ({
  default: () => <div>Game Page</div>,
}));

vi.mock("@/pages/GameSummaryPage", () => ({
  default: () => <div>Game Summary</div>,
}));

vi.mock("@/pages/GameDetailPage", () => ({
  default: () => <div>Game Details</div>,
}));

vi.mock("@/pages/GamesOverviewPage", () => ({
  default: () => <div>Games Overview</div>,
}));

vi.mock("@/pages/SettingsPage", () => ({
  default: () => <div>Settings Page</div>,
}));

vi.mock("@/pages/StatisticsPage", () => ({
  default: () => <div>Statistics Page</div>,
}));

vi.mock("@/pages/JoinedGamePage", () => ({
  default: () => <div>Joined Game Page</div>,
}));

vi.mock("@/pages/PlayerProfilePage", () => ({
  default: () => <div>Player Profile</div>,
}));

describe("App routing", () => {
  let App: typeof import("./App").default;

  beforeEach(async () => {
    vi.useRealTimers();
    vi.resetModules();
    window.history.pushState({}, "", "/");
    ({ default: App } = await import("./App"));
  });

  it("renders login page for root route", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "You have successfully left the game" }),
    ).toBeTruthy();
  });

  it("renders register page for /register route", async () => {
    window.history.pushState({}, "", "/register");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Create an account" })).toBeTruthy();
  });

  it("renders 404 page for unknown route", async () => {
    window.history.pushState({}, "", "/unknown-route");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeTruthy();
  });
});
