// Core HTTP client
export {
  apiClient,
  API_BASE_URL,
  clearUnauthorizedHandler,
  setUnauthorizedHandler,
} from "./client";
export { ApiError, ForbiddenError, NetworkError, TimeoutError, UnauthorizedError } from "./errors";
export type { ApiRequestConfig, ErrorPayload, HttpMethod, QueryParams, QueryValue } from "./types";

// Domain API modules
export * from "./game";
export * from "./room";
export * from "./auth";
export * from "./statistics";
