// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RegisterForm } from "./RegisterForm";

function renderForm(error: string | null) {
  return render(
    <MemoryRouter>
      <RegisterForm error={error} loading={false} onSubmit={vi.fn()} />
    </MemoryRouter>,
  );
}

describe("RegisterForm banners", () => {
  it("announces an error through role=alert", () => {
    renderForm("Email already used");

    expect(screen.getByRole("alert").textContent).toBe("Email already used");
  });

  it("renders no alert or status without an error", () => {
    renderForm(null);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
