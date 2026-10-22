import { ApiError } from "@/shared/api";
import { isRecord } from "@/lib/guards/guards";

/** The server refused to change a game that is no longer the newest one. */
export function isGameNotNewestError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    isRecord(error.data) &&
    error.data.error === "GAME_NOT_NEWEST"
  );
}
