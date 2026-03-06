// @vitest-environment jsdom
import type { ReactNode } from "react";
import { act, render, screen } from "@testing-library/react";
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

vi.mock("@/shared/api", () => ({
  clearUnauthorizedHandler: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
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

import { clearUnauthorizedHandler, setUnauthorizedHandler } from "@/shared/api";

describe("App routing", () => {
  let App: typeof import("./App").default;

  beforeEach(async () => {
    vi.clearAllMocks();
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

  it("renders start page for /start route", async () => {
    window.history.pushState({}, "", "/start");

    render(<App />);

    expect(await screen.findByText("Start Page")).toBeTruthy();
  });

  it("renders start page for /start/:id route", async () => {
    window.history.pushState({}, "", "/start/game-42");

    render(<App />);

    expect(await screen.findByText("Start Page")).toBeTruthy();
  });

  it("registers unauthorized navigation and clears it on unmount", async () => {
    window.history.pushState({}, "", "/register");

    const { unmount } = render(<App />);

    expect(await screen.findByRole("heading", { name: "Create an account" })).toBeTruthy();
    expect(setUnauthorizedHandler).toHaveBeenCalledTimes(1);

    const handler = vi.mocked(setUnauthorizedHandler).mock.calls[0]?.[0];

    expect(handler).toBeTypeOf("function");

    act(() => {
      handler?.();
    });

    expect(
      await screen.findByRole("heading", { name: "You have successfully left the game" }),
    ).toBeTruthy();

    const cleanupCallCountBeforeUnmount = vi.mocked(clearUnauthorizedHandler).mock.calls.length;

    unmount();

    expect(vi.mocked(clearUnauthorizedHandler).mock.calls.length).toBeGreaterThan(
      cleanupCallCountBeforeUnmount,
    );
  });

  it("renders 404 page for unknown route", async () => {
    window.history.pushState({}, "", "/unknown-route");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeTruthy();
  });
});
