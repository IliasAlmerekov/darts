// @vitest-environment jsdom
vi.mock("@/shared/api/auth", () => ({
  logout: vi.fn(),
}));

vi.mock("@/shared/services/browser/clientLogger", () => ({
  clientLogger: { error: vi.fn() },
}));

import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logout } from "@/shared/api/auth";
import { NetworkError } from "@/shared/api";
import { ROUTES } from "@/lib/router/routes";
import { LogoutButton } from "./index";

function renderOnJoinedPage(): ReturnType<typeof createMemoryRouter> {
  const router = createMemoryRouter(
    [
      { path: ROUTES.login, element: <p>Login form</p> },
      { path: ROUTES.joined, element: <LogoutButton /> },
    ],
    { initialEntries: [ROUTES.login, ROUTES.joined], initialIndex: 1 },
  );
  render(<RouterProvider router={router} />);
  return router;
}

function deferred(): {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
} {
  let resolve: () => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("LogoutButton", () => {
  beforeEach(() => {
    vi.mocked(logout).mockReset();
  });

  it("shows a Log out button", () => {
    renderOnJoinedPage();

    expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();
  });

  it("disables the button while logout runs, so a second press sends nothing", async () => {
    const request = deferred();
    vi.mocked(logout).mockReturnValueOnce(request.promise);
    renderOnJoinedPage();

    const button = screen.getByRole("button", { name: "Log out" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(button).toHaveProperty("disabled", true);
    expect(logout).toHaveBeenCalledTimes(1);

    request.resolve();
    expect(await screen.findByText("Login form")).toBeTruthy();
  });

  it("opens the login page in place of the current entry when logout succeeds", async () => {
    vi.mocked(logout).mockResolvedValueOnce(undefined);
    const router = renderOnJoinedPage();

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByText("Login form")).toBeTruthy();
    expect(router.state.location.pathname).toBe(ROUTES.login);
    expect(router.state.historyAction).toBe("REPLACE");
  });

  it("stays on the page and shows an error with Retry when logout fails", async () => {
    vi.mocked(logout).mockRejectedValueOnce(new NetworkError("Failed to fetch"));
    const router = renderOnJoinedPage();

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(router.state.location.pathname).toBe(ROUTES.joined);
  });

  it("sends logout again on Retry and opens the login page when it succeeds", async () => {
    vi.mocked(logout)
      .mockRejectedValueOnce(new NetworkError("Failed to fetch"))
      .mockResolvedValueOnce(undefined);
    const router = renderOnJoinedPage();

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Login form")).toBeTruthy();
    expect(logout).toHaveBeenCalledTimes(2);
    expect(router.state.historyAction).toBe("REPLACE");
  });
});
