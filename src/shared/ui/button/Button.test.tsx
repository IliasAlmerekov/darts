// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Button from "./Button";

describe("Button", () => {
  it("should render a link and avoid a nested button when isLink is true", () => {
    const { container } = render(
      <MemoryRouter>
        <Button isLink label="Go" link="/next" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link")).toBeTruthy();
    expect(container.querySelector("button")).toBeNull();
  });

  it("should prevent clicks and disable focus when the link variant is disabled", () => {
    const handleClick = vi.fn();
    render(
      <MemoryRouter>
        <Button isLink label="Disabled" link="/next" disabled handleClick={handleClick} />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link");
    fireEvent.click(link);

    expect(handleClick).not.toHaveBeenCalled();
    expect(link.getAttribute("aria-disabled")).toBe("true");
    expect(link.getAttribute("tabindex")).toBe("-1");
  });

  it("should render a button and call handleClick when isLink is false", () => {
    const handleClick = vi.fn();
    render(<Button label="Action" handleClick={handleClick} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should respect the disabled state when rendering a regular button", () => {
    const handleClick = vi.fn();
    render(<Button label="Disabled action" disabled handleClick={handleClick} />);

    const button = screen.getByRole("button", { name: "Disabled action" });
    fireEvent.click(button);

    expect(button).toHaveProperty("disabled", true);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
