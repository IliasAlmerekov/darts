// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

function renderForm(props: { error?: string | null; success?: string | null }) {
  return render(
    <MemoryRouter>
      <LoginForm
        error={props.error ?? null}
        success={props.success ?? null}
        loading={false}
        onSubmit={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe("LoginForm banners", () => {
  it("announces an error through role=alert", () => {
    renderForm({ error: "Invalid credentials" });

    expect(screen.getByRole("alert").textContent).toBe("Invalid credentials");
  });

  it("announces a success message through role=status", () => {
    renderForm({ success: "You have successfully left the game" });

    expect(screen.getByRole("status").textContent).toBe("You have successfully left the game");
  });

  it("renders no alert or status without error or success", () => {
    renderForm({});

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
