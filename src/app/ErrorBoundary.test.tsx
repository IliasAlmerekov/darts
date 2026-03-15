// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary from "@/app/ErrorBoundary";

const ThrowingChild = (): React.JSX.Element => {
  throw new Error("Crash");
};

describe("ErrorBoundary", () => {
  let errorHandler: ((event: ErrorEvent) => void) | null = null;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    errorHandler = (event) => {
      event.preventDefault();
    };
    window.addEventListener("error", errorHandler);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    if (errorHandler) {
      window.removeEventListener("error", errorHandler);
    }
    errorHandler = null;
  });

  it("should render fallback UI when a child throws", () => {
    render(
      <ErrorBoundary fallbackTitle="Oops" fallbackMessage="Try again">
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Oops")).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });

  it("should log crashes through the client logging policy when no custom handler is provided", () => {
    render(
      <ErrorBoundary fallbackTitle="Oops" fallbackMessage="Try again">
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(consoleErrorSpy.mock.calls).toEqual(
      expect.arrayContaining([
        [
          "[client:error] ui.error-boundary.crash",
          expect.objectContaining({
            context: expect.objectContaining({
              componentStack: expect.any(String),
            }),
            error: expect.objectContaining({
              message: "Crash",
              name: "Error",
            }),
          }),
        ],
      ]),
    );
  });

  it("should call the custom onError handler when one is provided", () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary fallbackTitle="Oops" fallbackMessage="Try again" onError={onError}>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Crash",
        name: "Error",
      }),
      expect.objectContaining({
        componentStack: expect.any(String),
      }),
    );
    expect(consoleErrorSpy.mock.calls).not.toContainEqual([
      "[client:error] ui.error-boundary.crash",
      expect.anything(),
    ]);
  });
});
