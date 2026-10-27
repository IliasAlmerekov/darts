// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "./index";
import { ApiError } from "@/shared/api";
import { ROUTES } from "@/lib/router/routes";
import { queryClient } from "@/shared/query/queryClient";
import { setCurrentGameId } from "@/shared/store";

const registerUserMock = vi.fn();

vi.mock("@/shared/api/auth", () => ({
  registerUser: (...args: unknown[]) => registerUserMock(...args),
  getAuthenticatedUser: vi.fn().mockResolvedValue(null),
}));

function renderRegisterRoute(): void {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ROUTES.register]}>
        <Routes>
          <Route path={ROUTES.register} element={<RegisterPage />} />
          <Route path={ROUTES.start()} element={<h1>Start page</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function submitRegistrationForm(): void {
  fireEvent.change(screen.getByLabelText(/^username/i), { target: { value: "ton80" } });
  fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: "ton@db-n.com" } });
  fireEvent.change(screen.getByLabelText(/^password/i), {
    target: { value: "long-enough-secret" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
}

describe("RegisterPage form registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    setCurrentGameId(null);
  });

  it("shows the mapped error and keeps the typed values after a failed registration", async () => {
    registerUserMock.mockRejectedValue(
      new ApiError("Validation failed", {
        status: 422,
        data: { errors: { email: ["This value is not a valid email address."] } },
      }),
    );

    renderRegisterRoute();
    submitRegistrationForm();

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Please enter a valid email address.",
    );
    expect(screen.getByLabelText<HTMLInputElement>(/^username/i).value).toBe("ton80");
    expect(screen.getByLabelText<HTMLInputElement>(/^email/i).value).toBe("ton@db-n.com");
    expect(screen.getByLabelText<HTMLInputElement>(/^password/i).value).toBe("long-enough-secret");
  });

  it("disables the fields and the button while the registration request runs", async () => {
    let finishRegistration: (reason: unknown) => void = () => undefined;
    registerUserMock.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        finishRegistration = reject;
      }),
    );

    renderRegisterRoute();
    submitRegistrationForm();

    expect((await screen.findByRole("status")).textContent).toBe("Creating your account…");
    expect(screen.getByRole("button", { name: "Create account" }).hasAttribute("disabled")).toBe(
      true,
    );
    expect(screen.getByLabelText<HTMLInputElement>(/^username/i).disabled).toBe(true);
    expect(screen.getByLabelText<HTMLInputElement>(/^email/i).disabled).toBe(true);
    expect(screen.getByLabelText<HTMLInputElement>(/^password/i).disabled).toBe(true);

    finishRegistration(new ApiError("Server error", { status: 500 }));

    await waitFor(() => {
      expect(screen.getByLabelText<HTMLInputElement>(/^username/i).disabled).toBe(false);
    });
  });

  it("opens the start page after a successful registration", async () => {
    registerUserMock.mockResolvedValueOnce({
      success: true,
      roles: ["ROLE_ADMIN"],
      id: 5,
      redirect: "/start",
    });

    renderRegisterRoute();
    submitRegistrationForm();

    expect(await screen.findByRole("heading", { name: "Start page" })).toBeTruthy();
  });
});
