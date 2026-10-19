// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ROUTES } from "@/lib/router/routes";
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

describe("RegisterForm login entry", () => {
  it("links Sign in to the login route", () => {
    renderForm(null);

    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe(ROUTES.login);
  });

  it("places Sign in outside the form, after Create account", () => {
    renderForm(null);
    const form = screen.getByTestId("register-form");
    const submit = screen.getByRole("button", { name: "Create account" });
    const signIn = screen.getByRole("link", { name: "Sign in" });

    expect(form.contains(signIn)).toBe(false);
    expect(submit.compareDocumentPosition(signIn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("puts the prompt and the Sign in link in one line of text", () => {
    renderForm(null);
    const line = screen.getByRole("link", { name: "Sign in" }).parentElement;

    expect(line?.tagName).toBe("P");
    expect(line?.textContent).toBe("Already have an account? Sign in");
  });
});

describe("RegisterForm pending state", () => {
  it("disables Create account and shows a spinner instead of text while loading", () => {
    render(
      <MemoryRouter>
        <RegisterForm error={null} loading={true} onSubmit={vi.fn()} />
      </MemoryRouter>,
    );

    const button = screen.getByRole("button", { name: "Create account" });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.textContent).toBe("");
    expect(screen.getByRole("status").textContent).toBe("Creating your account…");
  });
});

describe("RegisterForm password minimum", () => {
  it("describes the password field with the 8-character minimum", () => {
    renderForm(null);

    const description = screen.getByText("At least 8 characters.");

    expect(screen.getByLabelText(/^password/i).getAttribute("aria-describedby")).toBe(
      description.id,
    );
  });

  // jsdom skips the length check on submit; tests/auth/password-minimum.spec.ts covers it.
  it("constrains the password to at least 8 characters", () => {
    renderForm(null);

    expect(screen.getByLabelText<HTMLInputElement>(/^password/i).minLength).toBe(8);
  });
});
