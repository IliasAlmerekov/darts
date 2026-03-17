// @vitest-environment jsdom
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

vi.mock("@/shared/services/browser/clientLogger", () => ({
  clientLogger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
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
  scheduleStatisticsPrefetch: vi.fn(() => vi.fn()),
}));

vi.mock("@/shared/ui/skeletons", () => ({
  UniversalSkeleton: () => <div data-testid="universal-skeleton">Loading page</div>,
}));

vi.mock("@/pages/LoginPage", () => ({
  default: () => <h1>You have successfully left the game</h1>,
}));

vi.mock("@/pages/RegisterPage", () => ({
  default: () => <h1>Create an account</h1>,
}));

vi.mock("@/pages/StartPage/StartPage", () => ({
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

import { act, render, screen } from "@testing-library/react";
import { Outlet } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearUnauthorizedHandler, setUnauthorizedHandler } from "@/shared/api";
import { scheduleSelectiveRouteWarmUp, scheduleStatisticsPrefetch } from "@/app/routeWarmup";
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

  it("should render the login page when the current route is /", async () => {
    await renderApp();

    expect(
      await screen.findByRole("heading", { name: "You have successfully left the game" }),
    ).toBeTruthy();
  });

  it("should render the register page when the current route is /register", async () => {
    window.history.pushState({}, "", "/register");

    await renderApp();

    expect(await screen.findByRole("heading", { name: "Create an account" })).toBeTruthy();
  });

  it("should render the start page when the current route is /start", async () => {
    window.history.pushState({}, "", "/start");

    await renderApp();

    expect(await screen.findByText("Start Page")).toBeTruthy();
  });

  it("should render the start page when the current route is /start/:id", async () => {
    window.history.pushState({}, "", "/start/game-42");

    await renderApp();

    expect(await screen.findByText("Start Page")).toBeTruthy();
  });

  it("should render the admin layout route when the current route is an admin shell page", async () => {
    window.history.pushState({}, "", "/statistics");

    await renderApp();

    expect(await screen.findByTestId("admin-layout-route")).toBeTruthy();
    expect(await screen.findByText("Statistics Page")).toBeTruthy();
  });

  it("should render the settings page when the current route is /settings", async () => {
    window.history.pushState({}, "", "/settings");

    await renderApp();

    expect(await screen.findByTestId("admin-layout-route")).toBeTruthy();
    expect(await screen.findByText("Settings Page")).toBeTruthy();
  });

  it("should render the settings page when the current route is /settings/:id", async () => {
    window.history.pushState({}, "", "/settings/42");

    await renderApp();

    expect(await screen.findByTestId("admin-layout-route")).toBeTruthy();
    expect(await screen.findByText("Settings Page")).toBeTruthy();
  });

  it("should keep the admin layout visible when a nested lazy route suspends", async () => {
    const pendingStatisticsPage = new Promise<void>(() => undefined);

    window.history.pushState({}, "", "/statistics");
    vi.clearAllMocks();
    vi.resetModules();
    vi.doMock("@/pages/StatisticsPage", () => ({
      default: function StatisticsPage(): never {
        throw pendingStatisticsPage;
      },
    }));

    const { default: SuspenseApp } = await import("./App");

    await act(async () => {
      render(<SuspenseApp />);
      await vi.dynamicImportSettled();
    });

    expect(screen.getByTestId("admin-layout-route")).toBeTruthy();
    expect(screen.getByTestId("universal-skeleton")).toBeTruthy();
  });

  it("should render the route error boundary when a nested admin route throws", async () => {
    window.history.pushState({}, "", "/statistics");
    vi.clearAllMocks();
    vi.resetModules();
    vi.doMock("@/pages/StatisticsPage", () => ({
      default: function StatisticsPage(): never {
        throw new Error("Crash");
      },
    }));

    const { default: ErrorApp } = await import("./App");

    await act(async () => {
      render(<ErrorApp />);
      await vi.dynamicImportSettled();
    });

    expect(screen.getByTestId("admin-layout-route")).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("Please try refreshing the page.")).toBeTruthy();
  });

  it("should not render the admin layout route when the current route is an active game page", async () => {
    window.history.pushState({}, "", "/game/42");

    await renderApp();

    expect(await screen.findByText("Game Page")).toBeTruthy();
    expect(screen.queryByTestId("admin-layout-route")).toBeNull();
  });

  it("should register unauthorized navigation and clear it when the app unmounts", async () => {
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

  it("should schedule selective route warm-up and run cleanup when the app unmounts", async () => {
    const stopWarmup = vi.fn();
    vi.mocked(scheduleSelectiveRouteWarmUp).mockReturnValueOnce(stopWarmup);
    const stopStatisticsPrefetch = vi.fn();
    vi.mocked(scheduleStatisticsPrefetch).mockReturnValueOnce(stopStatisticsPrefetch);

    const { unmount } = await renderApp();

    expect(scheduleSelectiveRouteWarmUp).toHaveBeenCalledTimes(1);
    expect(scheduleStatisticsPrefetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      unmount();
    });

    expect(stopWarmup).toHaveBeenCalledTimes(1);
    expect(stopStatisticsPrefetch).toHaveBeenCalledTimes(1);
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

  it("should render the 404 page when the current route is unknown", async () => {
    window.history.pushState({}, "", "/unknown-route");

    await renderApp();

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeTruthy();
  });
});
