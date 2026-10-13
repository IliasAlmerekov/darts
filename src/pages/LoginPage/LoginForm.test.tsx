// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  it("announces a submission error as an alert", () => {
    render(
      <MemoryRouter>
        <LoginForm error="Invalid credentials" loading={false} onSubmit={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert").textContent).toBe("Invalid credentials");
  });
});
