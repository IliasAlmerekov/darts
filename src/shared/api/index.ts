// Core HTTP client (lives in shared/lib/api — aliased as @/lib/api)
export { apiClient, API_BASE_URL } from "@/lib/api";
export { ApiError, ForbiddenError, NetworkError, UnauthorizedError } from "@/lib/api/errors";
export type { ApiRequestConfig, ErrorPayload, HttpMethod, QueryParams, QueryValue } from "@/lib/api/types";

// Domain API modules
export * from "./game";
export * from "./room";
export * from "./auth";
export * from "./statistics";
