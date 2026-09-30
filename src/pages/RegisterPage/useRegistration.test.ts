// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api";
import { useRegistration } from "./useRegistration";

const navigateMock = vi.fn();
const registerUserMock = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/shared/api/auth", () => ({
  registerUser: (...args: unknown[]) => registerUserMock(...args),
}));

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
});
