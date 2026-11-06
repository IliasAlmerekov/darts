import { ApiError } from "@/shared/api";
import type { AddGuestErrorResponse } from "@/shared/api/room";
import { isRecord } from "@/lib/guards/guards";

interface UsernameTaken {
  message: string;
  suggestions: string[];
}

function isAddGuestErrorResponse(data: unknown): data is AddGuestErrorResponse {
  if (!isRecord(data)) {
    return false;
  }

  return (
    data.success === false &&
    data.error === "USERNAME_TAKEN" &&
    typeof data.message === "string" &&
    (data.suggestions === undefined ||
      (Array.isArray(data.suggestions) &&
        data.suggestions.every((suggestion) => typeof suggestion === "string")))
  );
}

/**
 * Reads the server message and name suggestions from a 409 `USERNAME_TAKEN` answer to an add
 * guest request. Returns null for any other error or a payload of another shape.
 */
export function readUsernameTaken(error: unknown): UsernameTaken | null {
  if (
    !(error instanceof ApiError) ||
    error.status !== 409 ||
    !isAddGuestErrorResponse(error.data)
  ) {
    return null;
  }

  return { message: error.data.message, suggestions: error.data.suggestions ?? [] };
}
