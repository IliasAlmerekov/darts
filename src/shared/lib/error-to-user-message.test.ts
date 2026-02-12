import { describe, expect, it } from "vitest";
import { ApiError, NetworkError } from "@/lib/api";
import { toUserErrorMessage } from "./error-to-user-message";

describe("toUserErrorMessage", () => {
  it("maps network errors", () => {
    expect(toUserErrorMessage(new NetworkError())).toBe(
      "Network error. Please check your connection and try again.",
    );
  });

  it("maps api 500 errors", () => {
    expect(
      toUserErrorMessage(
        new ApiError("Internal Server Error", {
          status: 500,
        }),
      ),
    ).toBe("Server error. Please try again later.");
  });

  it("maps api 404 errors", () => {
    expect(
      toUserErrorMessage(
        new ApiError("Not found", {
          status: 404,
        }),
      ),
    ).toBe("The requested resource was not found.");
  });

  it("uses payload message if no known mapping exists", () => {
    expect(
      toUserErrorMessage(
        new ApiError("Validation failed", {
          status: 422,
          data: { message: "Round is locked." },
        }),
      ),
    ).toBe("Round is locked.");
  });

  it("uses fallback for unknown errors", () => {
    expect(toUserErrorMessage({})).toBe("Something went wrong. Please try again.");
    expect(toUserErrorMessage({}, "Custom fallback")).toBe("Custom fallback");
  });
});
