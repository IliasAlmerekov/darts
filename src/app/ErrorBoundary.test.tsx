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

  it("renders fallback UI when child throws", () => {
    render(
      <ErrorBoundary fallbackTitle="Oops" fallbackMessage="Try again">
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Oops")).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });
});
