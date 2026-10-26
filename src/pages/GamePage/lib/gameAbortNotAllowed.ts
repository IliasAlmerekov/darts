import { ApiError } from "@/shared/api";
import { isRecord } from "@/lib/guards/guards";

/** The server refused to abort a game that is in the lobby or already finished. */
export function isGameAbortNotAllowedError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    isRecord(error.data) &&
    error.data.error === "GAME_ABORT_NOT_ALLOWED"
  );
}
