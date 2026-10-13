// @vitest-environment jsdom
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/shared/api/auth", () => ({
  registerUser: (...args: unknown[]) => registerUserMock(...args),
}));

vi.mock("@/shared/services/browser/clientLogger", () => ({
  clientLogger: { warn: vi.fn(), error: vi.fn() },
}));

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { useRegistration } from "./useRegistration";

const navigateMock = vi.fn();
const registerUserMock = vi.fn();

describe("useRegistration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should set mapped validation errors when registration fails with 422", async () => {
    registerUserMock.mockRejectedValueOnce(
      new ApiError("Validation failed", {
        status: 422,
        data: {
          errors: {
            email: ["This value is not a valid email address."],
            plainPassword: ["This value is too short."],
          },
        },
      }),
    );

    const { result } = renderHook(() => useRegistration());

    await act(async () => {
      await result.current.register("john", "invalid-email", "123");
    });

    expect(result.current.error).toBe("Please enter a valid email address.\nPassword is invalid.");
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("should retry registration with refreshed CSRF token when first attempt fails", async () => {
    registerUserMock.mockRejectedValueOnce(
      new ApiError("Validation failed", {
        status: 422,
        data: {
          errors: {
            _csrf_token: ["The CSRF token is invalid."],
          },
        },
      }),
    );
    registerUserMock.mockResolvedValueOnce({
      redirect: "/start",
    });

    const { result } = renderHook(() => useRegistration());

    await act(async () => {
      await result.current.register("john", "john@example.com", "Password123!");
    });

    expect(registerUserMock).toHaveBeenNthCalledWith(
      1,
      {
        username: "john",
        email: "john@example.com",
        password: "Password123!",
      },
      false,
    );
    expect(registerUserMock).toHaveBeenNthCalledWith(
      2,
      {
        username: "john",
        email: "john@example.com",
        password: "Password123!",
      },
      true,
    );
    expect(navigateMock).toHaveBeenCalledWith("/start");
    expect(result.current.error).toBeNull();
  });

  it("should navigate to the start route when registration returns an off-origin redirect", async () => {
    registerUserMock.mockResolvedValueOnce({
      redirect: "/\\evil.example",
    });

    const { result } = renderHook(() => useRegistration());

    await act(async () => {
      await result.current.register("john", "john@example.com", "Password123!");
    });

    expect(navigateMock).toHaveBeenCalledWith("/start");
    expect(navigateMock).not.toHaveBeenCalledWith("/\\evil.example");
    expect(vi.mocked(clientLogger.warn)).toHaveBeenCalledWith("auth.registration.unsafe_redirect", {
      redirect: "/\\evil.example",
    });
  });

  it("should not warn when registration redirects to the start route by a same-origin URL", async () => {
    registerUserMock.mockResolvedValueOnce({
      redirect: `${window.location.origin}/start`,
    });

    const { result } = renderHook(() => useRegistration());

    await act(async () => {
      await result.current.register("john", "john@example.com", "Password123!");
    });

    expect(navigateMock).toHaveBeenCalledWith("/start");
    expect(vi.mocked(clientLogger.warn)).not.toHaveBeenCalled();
  });
});
