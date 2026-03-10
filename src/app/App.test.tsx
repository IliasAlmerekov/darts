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

vi.mock("@/app/routes/AdminLayoutRoute", () => ({
  default: () => (
    <div data-testid="admin-layout-route">
      <Outlet />
    </div>
  ),
}));

vi.mock("@/shared/api", () => ({
  clearUnauthorizedHandler: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
}));

vi.mock("@/shared/store/auth", () => ({
  invalidateAuthState: vi.fn(),
}));

vi.mock("@/shared/store/game-session", () => ({
  resetRoomStore: vi.fn(),
}));

vi.mock("@/shared/store/game-state", () => ({
  resetGameStore: vi.fn(),
}));

vi.mock("@/app/routeWarmup", () => ({
  scheduleSelectiveRouteWarmUp: vi.fn(() => vi.fn()),
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
import { scheduleSelectiveRouteWarmUp } from "@/app/routeWarmup";
import { invalidateAuthState } from "@/shared/store/auth";
import { resetRoomStore } from "@/shared/store/game-session";
import { resetGameStore } from "@/shared/store/game-state";

describe("App routing", () => {
  let App: typeof import("./App").default;

  const renderApp = async (): Promise<ReturnType<typeof render>> => {
    let rendered: ReturnType<typeof render> | undefined;

    await act(async () => {
      rendered = render(<App />);
      await vi.dynamicImportSettled();
    });

    if (!rendered) {
      throw new Error("Expected App to render");
    }

    return rendered;
  };

  const triggerUnauthorizedHandler = async (): Promise<void> => {
    const handler = vi.mocked(setUnauthorizedHandler).mock.calls[0]?.[0];

    expect(handler).toBeTypeOf("function");

    await act(async () => {
      handler?.();
    });
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.resetModules();
    window.history.pushState({}, "", "/");
    ({ default: App } = await import("./App"));
  });

  it("renders login page for root route", async () => {
    await renderApp();

    expect(
      await screen.findByRole("heading", { name: "You have successfully left the game" }),
    ).toBeTruthy();
  });

  it("renders register page for /register route", async () => {
    window.history.pushState({}, "", "/register");

    await renderApp();

    expect(await screen.findByRole("heading", { name: "Create an account" })).toBeTruthy();
  });

  it("renders start page for /start route", async () => {
    window.history.pushState({}, "", "/start");

    await renderApp();

    expect(await screen.findByText("Start Page")).toBeTruthy();
  });

  it("renders start page for /start/:id route", async () => {
    window.history.pushState({}, "", "/start/game-42");

    await renderApp();

    expect(await screen.findByText("Start Page")).toBeTruthy();
  });

  it("renders admin layout route for admin shell pages", async () => {
    window.history.pushState({}, "", "/statistics");

    await renderApp();

    expect(await screen.findByTestId("admin-layout-route")).toBeTruthy();
    expect(await screen.findByText("Statistics Page")).toBeTruthy();
  });

  it("does not render admin layout route for active game pages", async () => {
    window.history.pushState({}, "", "/game/42");

    await renderApp();

    expect(await screen.findByText("Game Page")).toBeTruthy();
    expect(screen.queryByTestId("admin-layout-route")).toBeNull();
  });

  it("registers unauthorized navigation and clears it on unmount", async () => {
    window.history.pushState({}, "", "/register");

    const { unmount } = await renderApp();

    expect(await screen.findByRole("heading", { name: "Create an account" })).toBeTruthy();
    expect(setUnauthorizedHandler).toHaveBeenCalledTimes(1);

    await triggerUnauthorizedHandler();

    expect(
      await screen.findByRole("heading", { name: "You have successfully left the game" }),
    ).toBeTruthy();

    const cleanupCallCountBeforeUnmount = vi.mocked(clearUnauthorizedHandler).mock.calls.length;

    await act(async () => {
      unmount();
    });

    expect(vi.mocked(clearUnauthorizedHandler).mock.calls.length).toBeGreaterThan(
      cleanupCallCountBeforeUnmount,
    );
  });

  it("schedules selective route warm-up on mount and runs cleanup on unmount", async () => {
    const stopWarmup = vi.fn();
    vi.mocked(scheduleSelectiveRouteWarmUp).mockReturnValueOnce(stopWarmup);

    const { unmount } = await renderApp();

    expect(scheduleSelectiveRouteWarmUp).toHaveBeenCalledTimes(1);

    await act(async () => {
      unmount();
    });

    expect(stopWarmup).toHaveBeenCalledTimes(1);
  });

  it("should clear auth, room, and game stores when unauthorized handler fires", async () => {
    window.history.pushState({}, "", "/start");

    await renderApp();

    expect(await screen.findByText("Start Page")).toBeTruthy();
    expect(setUnauthorizedHandler).toHaveBeenCalledTimes(1);

    await triggerUnauthorizedHandler();

    expect(vi.mocked(invalidateAuthState)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(resetRoomStore)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(resetGameStore)).toHaveBeenCalledTimes(1);
  });

  it("should navigate to login with state.from set to the current pathname when unauthorized", async () => {
    window.history.pushState({}, "", "/start");

    await renderApp();

    expect(await screen.findByText("Start Page")).toBeTruthy();
    expect(setUnauthorizedHandler).toHaveBeenCalledTimes(1);

    await triggerUnauthorizedHandler();

    expect(
      await screen.findByRole("heading", { name: "You have successfully left the game" }),
    ).toBeTruthy();
    expect(window.location.pathname).toBe("/");
  });

  it("renders 404 page for unknown route", async () => {
    window.history.pushState({}, "", "/unknown-route");

    await renderApp();

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeTruthy();
  });
});
