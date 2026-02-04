// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Button from "./Button";

describe("Button", () => {
  it("renders a link when isLink is true and avoids nested button", () => {
    const { container } = render(
      <MemoryRouter>
        <Button isLink label="Go" link="/next" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link")).toBeTruthy();
    expect(container.querySelector("button")).toBeNull();
  });

  it("prevents click and disables focus for disabled links", () => {
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

  it("renders a button when isLink is false and calls handleClick", () => {
    const handleClick = vi.fn();
    render(<Button label="Action" handleClick={handleClick} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
