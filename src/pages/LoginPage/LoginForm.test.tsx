// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES } from "@/lib/router/routes";
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

function advanceToNextFrame(): void {
  act(() => {
    vi.advanceTimersToNextFrame();
  });
}

describe("LoginForm login and registration controls", () => {
  it("has no Remember me checkbox", () => {
    renderForm({});

    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByLabelText(/remember me/i)).toBeNull();
  });

  it("links Sign up to the registration route", () => {
    renderForm({});

    expect(screen.getByRole("link", { name: "Sign up" }).getAttribute("href")).toBe(
      ROUTES.register,
    );
  });

  it("places Sign up outside the form, after Sign in", () => {
    renderForm({});
    const form = screen.getByTestId("login-form");
    const signIn = screen.getByRole("button", { name: "Sign in" });
    const signUp = screen.getByRole("link", { name: "Sign up" });

    expect(form.contains(signUp)).toBe(false);
    expect(signIn.compareDocumentPosition(signUp) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("puts the prompt and the Sign up link in one line of text", () => {
    renderForm({});
    const line = screen.getByRole("link", { name: "Sign up" }).parentElement;

    expect(line?.tagName).toBe("P");
    expect(line?.textContent).toBe("Don't have an account? Sign up");
  });
});

describe("LoginForm banners", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("announces an error through role=alert", () => {
    renderForm({ error: "Invalid credentials" });

    expect(screen.getByRole("alert").textContent).toBe("Invalid credentials");
  });

  it("renders the status region empty first and fills it on the next frame", () => {
    renderForm({ success: "You have successfully left the game" });

    expect(screen.getByRole("status").textContent).toBe("");

    advanceToNextFrame();

    expect(screen.getByRole("status").textContent).toBe("You have successfully left the game");
  });

  it("announces a success message through role=status", () => {
    renderForm({ success: "You have successfully left the game" });
    advanceToNextFrame();

    expect(screen.getByRole("status").textContent).toBe("You have successfully left the game");
  });

  it("keeps an empty status region mounted without a success message", () => {
    renderForm({});

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("fills the same status region when a success message arrives later", () => {
    const { rerender } = renderForm({});
    const region = screen.getByRole("status");

    rerender(
      <MemoryRouter>
        <LoginForm error={null} success="Saved" loading={false} onSubmit={vi.fn()} />
      </MemoryRouter>,
    );

    advanceToNextFrame();

    expect(screen.getByRole("status")).toBe(region);
    expect(region.textContent).toBe("Saved");
  });
});

describe("LoginForm email placeholder", () => {
  it("shows a @db-n.com address as the email placeholder", () => {
    renderForm({});

    expect(screen.getByLabelText<HTMLInputElement>(/^email/i).placeholder).toBe("name@db-n.com");
  });
});
