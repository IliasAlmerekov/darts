// @vitest-environment jsdom
import React from "react";
import { createMemoryRouter, data, RouterProvider } from "react-router-dom";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary from "@/app/ErrorBoundary";
import { clientLogger } from "@/shared/services/browser/clientLogger";

vi.mock("@/shared/services/browser/clientLogger", () => ({
  clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const ThrowingRoute = (): React.JSX.Element => {
  throw new Error("Crash");
};

const firstCrash = new Error("First crash");
const secondCrash = new Error("Second crash");

const FirstThrowingRoute = (): React.JSX.Element => {
  throw firstCrash;
};

const SecondThrowingRoute = (): React.JSX.Element => {
  throw secondCrash;
};

const routeCrashLogs = (): unknown[] =>
  vi
    .mocked(clientLogger.error)
    .mock.calls.filter(([event]) => event === "route_error_boundary_crash")
    .map(([, payload]) => payload);

describe("ErrorBoundary", () => {
  let errorHandler: ((event: ErrorEvent) => void) | null = null;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  const createRouter = (
    routes: Parameters<typeof createMemoryRouter>[0],
  ): ReturnType<typeof createMemoryRouter> => createMemoryRouter(routes);

  beforeEach(() => {
    vi.mocked(clientLogger.error).mockClear();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    errorHandler = (event) => {
      event.preventDefault();
    };
    window.addEventListener("error", errorHandler);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
    if (errorHandler) {
      window.removeEventListener("error", errorHandler);
    }
    errorHandler = null;
  });

  it("should render fallback UI when a child throws", () => {
    const router = createRouter([
      {
        path: "/",
        element: <ThrowingRoute />,
        errorElement: <ErrorBoundary />,
      },
    ]);

    render(<RouterProvider router={router} />);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("Please try refreshing the page.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reload" })).toBeTruthy();
  });

  it("should render fallback UI when a loader throws a route response", async () => {
    const router = createRouter([
      {
        path: "/",
        loader: () => {
          throw data({ message: "No access" }, { status: 403, statusText: "Forbidden" });
        },
        element: <div>Protected</div>,
        errorElement: <ErrorBoundary />,
      },
    ]);

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(await screen.findByText("Something went wrong")).toBeTruthy();
    expect(await screen.findByText("Please try refreshing the page.")).toBeTruthy();
  });

  it("should render the not found page without logging a crash for a 404 route error", async () => {
    const router = createRouter([
      {
        path: "/",
        loader: () => {
          throw new Response(null, { status: 404, statusText: "Not Found" });
        },
        element: <div>Protected</div>,
        errorElement: <ErrorBoundary />,
      },
    ]);

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { level: 1, name: "Page not found" })).toBeTruthy();
    expect(screen.queryByText("Something went wrong")).toBeNull();
    expect(clientLogger.error).not.toHaveBeenCalled();
  });

  it("should log a crash for an error that is not a 404", async () => {
    const router = createRouter([
      {
        path: "/",
        loader: () => {
          throw data(null, { status: 500, statusText: "Server Error" });
        },
        element: <div>Protected</div>,
        errorElement: <ErrorBoundary />,
      },
    ]);

    render(<RouterProvider router={router} />);

    expect(await screen.findByText("Something went wrong")).toBeTruthy();
    expect(clientLogger.error).toHaveBeenCalledWith(
      "route_error_boundary_crash",
      expect.objectContaining({ context: expect.objectContaining({ status: 500 }) }),
    );
  });

  it("should expose a recovery action when the route crashes", () => {
    const router = createRouter([
      {
        path: "/",
        element: <ThrowingRoute />,
        errorElement: <ErrorBoundary />,
      },
    ]);

    render(<RouterProvider router={router} />);

    expect(screen.getByRole("button", { name: "Reload" })).toBeTruthy();
  });

  it("should log one route error once under StrictMode", async () => {
    const router = createRouter([
      {
        path: "/",
        element: <ThrowingRoute />,
        errorElement: <ErrorBoundary />,
      },
    ]);

    render(
      <React.StrictMode>
        <RouterProvider router={router} />
      </React.StrictMode>,
    );

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(routeCrashLogs()).toEqual([
      expect.objectContaining({ error: expect.objectContaining({ message: "Crash" }) }),
    ]);
  });

  it("should log a different route error after navigation under StrictMode", async () => {
    const router = createRouter([
      {
        path: "/",
        errorElement: <ErrorBoundary />,
        children: [
          { index: true, element: <FirstThrowingRoute /> },
          { path: "other", element: <SecondThrowingRoute /> },
        ],
      },
    ]);

    render(
      <React.StrictMode>
        <RouterProvider router={router} />
      </React.StrictMode>,
    );

    expect(await screen.findByRole("alert")).toBeTruthy();

    await act(async () => {
      await router.navigate("/other");
    });

    expect(router.state.location.pathname).toBe("/other");
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(routeCrashLogs()).toEqual([
      expect.objectContaining({ error: firstCrash }),
      expect.objectContaining({ error: secondCrash }),
    ]);
  });
});
