// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./index";

const useLoginPageMock = vi.fn();
const goToPlayerProfileMock = vi.fn();

vi.mock("./useLoginPage", () => ({
  useLoginPage: () => useLoginPageMock(),
}));

function givenScreen(screenState: unknown): void {
  useLoginPageMock.mockReturnValue({
    screen: screenState,
    error: null,
    loading: false,
    successMessage: null,
    handleSubmit: vi.fn(),
    goToPlayerProfile: goToPlayerProfileMock,
  });
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows only the login check while the auth check runs", () => {
    givenScreen({ type: "checking" });

    renderPage();

    expect(screen.getByRole("status").textContent).toContain("Checking your login…");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByTestId("login-form")).toBeNull();
  });

  it("shows the login form when nobody is logged in", () => {
    givenScreen({ type: "form" });

    renderPage();

    expect(screen.getByTestId("login-form")).toBeTruthy();
    expect(screen.queryByText("Checking your login…")).toBeNull();
  });

  it("shows the invitation error with a button to the player profile", () => {
    givenScreen({ type: "invitation-error", message: "This game has already started" });

    renderPage();

    expect(screen.getByRole("heading", { name: "This game has already started" })).toBeTruthy();
    expect(screen.queryByTestId("login-form")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Go to my profile" }));

    expect(goToPlayerProfileMock).toHaveBeenCalledTimes(1);
  });
});
