// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import BackButton from "./BackButton";

describe("BackButton", () => {
  it("should render a link when the to prop is provided", () => {
    render(
      <MemoryRouter>
        <BackButton to="/games" />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Back" });

    expect(link.getAttribute("href")).toBe("/games");
    expect(screen.getByText("Back")).toBeTruthy();
  });

  it("should render a button and call onClick when action variant is used", () => {
    const handleClick = vi.fn();
    render(<BackButton onClick={handleClick} ariaLabel="Back to Home" />);

    const button = screen.getByRole("button", { name: "Back to Home" });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Back")).toBeTruthy();
  });
});
