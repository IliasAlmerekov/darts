// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LinkButton from "./LinkButton";

describe("LinkButton", () => {
  it("should render the icon only when the icon prop is provided", () => {
    const { container, rerender } = render(<LinkButton label="Open" />);

    expect(container.querySelector("img")).toBeNull();

    rerender(<LinkButton icon="/plus.svg" label="Open" />);

    expect(container.querySelector("img")).toBeTruthy();
  });

  it("should not call the click handler and apply disabled link semantics when disabled", () => {
    const handleClick = vi.fn();
    render(<LinkButton href="/start" label="Create" handleClick={handleClick} disabled />);

    const link = screen.getByText("Create").closest("a");
    if (!link) {
      throw new Error("Expected anchor element");
    }

    fireEvent.click(link);

    expect(handleClick).not.toHaveBeenCalled();
    expect(link.getAttribute("href")).toBe("/start");
    expect(link.getAttribute("tabindex")).toBe("-1");
    expect(link.getAttribute("aria-disabled")).toBe("true");
  });

  it("should call the click handler when the button variant is enabled", () => {
    const handleClick = vi.fn();
    render(<LinkButton label="Create" handleClick={handleClick} />);

    const link = screen.getByText("Create").closest("a");
    const button = screen.getByRole("button", { name: "Create" });

    expect(link).toBeNull();

    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should keep href and enabled link semantics when the link variant is enabled", () => {
    render(<LinkButton href="/start" label="Create" />);

    const link = screen.getByText("Create").closest("a");
    if (!link) {
      throw new Error("Expected anchor element");
    }
    expect(link.getAttribute("href")).toBe("/start");
    expect(link.getAttribute("aria-disabled")).toBeNull();
  });
});
