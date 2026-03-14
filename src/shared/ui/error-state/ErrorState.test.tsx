// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ErrorState } from "./ErrorState";

describe("ErrorState", () => {
  it("should render the alert title and message when content is provided", () => {
    render(<ErrorState title="Could not load game" message="Please try again." />);

    const alert = screen.getByRole("alert");
    expect(alert).toBeTruthy();
    expect(screen.getByText("Could not load game")).toBeTruthy();
    expect(screen.getByText("Please try again.")).toBeTruthy();
  });

  it("should render button and link actions when both actions are provided", () => {
    const onRetry = vi.fn();

    render(
      <MemoryRouter>
        <ErrorState
          title="Failed"
          message="The request failed."
          primaryAction={{
            label: "Retry",
            onClick: onRetry,
          }}
          secondaryAction={{
            label: "Back",
            to: "/start",
          }}
        />
      </MemoryRouter>,
    );

    screen.getByRole("button", { name: "Retry" }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Back" }).getAttribute("href")).toBe("/start");
  });
});
