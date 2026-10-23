// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary from "@/app/ErrorBoundary";
import { createRootErrorOptions } from "@/app/rootErrorOptions";
import { createClientLogger } from "@/shared/services/browser/clientLogger";

const ThrowingComponent = (): React.JSX.Element => {
  throw new Error("Root crash");
};

describe("createRootErrorOptions", () => {
  const sink = { error: vi.fn(), warn: vi.fn() };
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    sink.error.mockReset();
    sink.warn.mockReset();
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container.remove();
    vi.restoreAllMocks();
  });

  it("logs a render error outside every boundary once as root.render.failed", async () => {
    root = createRoot(container, createRootErrorOptions(createClientLogger(sink)));

    // Rendered outside act(): inside act() React rethrows uncaught errors
    // instead of calling onUncaughtError.
    root.render(<ThrowingComponent />);

    await vi.waitFor(() => {
      expect(sink.error).toHaveBeenCalledTimes(1);
    });
    expect(sink.error).toHaveBeenCalledWith("[client:error] root.render.failed", {
      context: { componentStack: expect.stringContaining("ThrowingComponent") },
      error: expect.objectContaining({ name: "Error", message: "Root crash" }),
    });
    expect(sink.warn).not.toHaveBeenCalled();
  });

  it("logs a recoverable error once as root.render.recovered with its cause", () => {
    const { onRecoverableError } = createRootErrorOptions(createClientLogger(sink));
    const cause = new Error("Hydration mismatch");

    onRecoverableError?.(new Error("Recovered by client render", { cause }), {
      componentStack: "\n    at Shell",
    });

    expect(sink.warn).toHaveBeenCalledTimes(1);
    expect(sink.warn).toHaveBeenCalledWith("[client:warn] root.render.recovered", {
      context: {
        cause: expect.objectContaining({ name: "Error", message: "Hydration mismatch" }),
        componentStack: "\n    at Shell",
      },
      error: expect.objectContaining({ name: "Error", message: "Recovered by client render" }),
    });
    expect(sink.error).not.toHaveBeenCalled();
  });

  it("leaves a route render error to the route ErrorBoundary", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const router = createMemoryRouter([
      { path: "/", element: <ThrowingComponent />, errorElement: <ErrorBoundary /> },
    ]);
    root = createRoot(container, createRootErrorOptions(createClientLogger(sink)));

    await act(async () => {
      root?.render(<RouterProvider router={router} />);
    });

    const routeCrashLogs = consoleErrorSpy.mock.calls.filter(
      ([message]) => message === "[client:error] route_error_boundary_crash",
    );
    expect(routeCrashLogs).toHaveLength(1);
    expect(sink.error).not.toHaveBeenCalled();
    expect(sink.warn).not.toHaveBeenCalled();
  });
});
