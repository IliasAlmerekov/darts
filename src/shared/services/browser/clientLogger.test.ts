import { describe, expect, it, vi } from "vitest";
import {
  REDACTED_VALUE,
  createClientLogger,
  sanitizeClientLogPayload,
  serializeClientLogError,
} from "./clientLogger";

describe("sanitizeClientLogPayload", () => {
  it("redacts sensitive keys recursively without mutating the original payload", () => {
    const payload = {
      invitationLink: "https://example.com/invite/42?token=secret",
      nested: {
        password: "top-secret",
        items: [
          {
            csrfToken: "csrf-token",
            safe: "ok",
          },
        ],
      },
    };

    expect(sanitizeClientLogPayload(payload)).toEqual({
      invitationLink: REDACTED_VALUE,
      nested: {
        password: REDACTED_VALUE,
        items: [
          {
            csrfToken: REDACTED_VALUE,
            safe: "ok",
          },
        ],
      },
    });
    expect(payload.invitationLink).toBe("https://example.com/invite/42?token=secret");
    expect(payload.nested.password).toBe("top-secret");
  });
});

describe("serializeClientLogError", () => {
  it("returns a stable error shape for unknown error values", () => {
    expect(serializeClientLogError(new Error("boom"))).toEqual(
      expect.objectContaining({
        name: "Error",
        message: "boom",
      }),
    );
    expect(serializeClientLogError("boom")).toEqual({
      name: "NonError",
      message: "boom",
    });
  });
});

describe("createClientLogger", () => {
  it("emits structured warn and error console entries with redacted payloads", () => {
    const warn = vi.fn();
    const error = vi.fn();
    const logger = createClientLogger({ warn, error });

    logger.warn("room_stream_invalid_payload", {
      context: {
        type: "throw",
        invitationLink: "https://example.com/invite/7",
      },
    });
    logger.error("game-session.persist-invitation.failed", {
      context: {
        invitation: {
          gameId: 7,
          invitationLink: "https://example.com/invite/7",
        },
      },
      error: new Error("quota exceeded"),
    });

    expect(warn).toHaveBeenCalledWith("[client:warn] room_stream_invalid_payload", {
      context: {
        type: "throw",
        invitationLink: REDACTED_VALUE,
      },
    });
    expect(error).toHaveBeenCalledWith("[client:error] game-session.persist-invitation.failed", {
      context: {
        invitation: {
          gameId: 7,
          invitationLink: REDACTED_VALUE,
        },
      },
      error: expect.objectContaining({
        name: "Error",
        message: "quota exceeded",
      }),
    });
  });
});
