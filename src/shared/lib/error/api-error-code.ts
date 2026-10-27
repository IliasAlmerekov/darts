import { ApiError } from "@/shared/api";
import { isRecord } from "@/lib/guards/guards";

/**
 * True for a 409 `ApiError` whose payload `error` field is `code`, such as `GAME_ROOM_FULL`.
 */
export function isApiErrorCode(error: unknown, code: string): boolean {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    isRecord(error.data) &&
    error.data.error === code
  );
}
