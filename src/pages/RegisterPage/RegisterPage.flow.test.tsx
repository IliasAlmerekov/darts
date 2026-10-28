// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "./index";
import { ApiError } from "@/shared/api";
import { getAuthenticatedUser, registerUser } from "@/shared/api/auth";
import { ROUTES } from "@/lib/router/routes";
import { queryClient } from "@/shared/query/queryClient";
import { setCurrentGameId } from "@/shared/store";

vi.mock("@/shared/api/auth", () => ({
  registerUser: vi.fn(),
  getAuthenticatedUser: vi.fn(),
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

function submitRegistrationForm(email = "ton@db-n.com"): void {
  fireEvent.change(screen.getByLabelText(/^username/i), { target: { value: "ton80" } });
  fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: email } });
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
    vi.mocked(getAuthenticatedUser).mockResolvedValueOnce(null);
  });

  it("shows the domain message and keeps the typed values after a gmail registration", async () => {
    vi.mocked(registerUser).mockRejectedValueOnce(
      new ApiError("REQUEST_VALIDATION_FAILED", {
        status: 422,
        data: {
          success: false,
          error: "REQUEST_VALIDATION_FAILED",
          message: "The request body failed validation.",
          violations: [
            {
              field: "email",
              code: "EMAIL_DOMAIN_NOT_ALLOWED",
              message: "Please register with your @db-n.com email address",
            },
          ],
        },
      }),
    );

    renderRegisterRoute();
    submitRegistrationForm("ton@gmail.com");

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Only @db-n.com email addresses can register.",
    );
    expect(screen.getByLabelText<HTMLInputElement>(/^username/i).value).toBe("ton80");
    expect(screen.getByLabelText<HTMLInputElement>(/^email/i).value).toBe("ton@gmail.com");
    expect(screen.getByLabelText<HTMLInputElement>(/^password/i).value).toBe("long-enough-secret");
  });

  it("disables the fields and the button while the registration request runs", async () => {
    let finishRegistration: (reason: unknown) => void = () => undefined;
    vi.mocked(registerUser).mockReturnValueOnce(
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
    vi.mocked(registerUser).mockResolvedValueOnce({
      success: true,
      roles: ["ROLE_ADMIN"],
      id: 5,
      redirect: "/start",
    });

    renderRegisterRoute();
    submitRegistrationForm();

    expect(await screen.findByRole("heading", { name: "Start page" })).toBeTruthy();
  });

  it("hides the previous error while the next registration request runs", async () => {
    vi.mocked(registerUser).mockRejectedValueOnce(new ApiError("Server error", { status: 500 }));
    vi.mocked(registerUser).mockReturnValueOnce(new Promise(() => undefined));

    renderRegisterRoute();
    submitRegistrationForm();
    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("status")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
