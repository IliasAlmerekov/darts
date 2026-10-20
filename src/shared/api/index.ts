// Core HTTP client
export { clearUnauthorizedHandler, setUnauthorizedHandler } from "./client";
export {
  ApiError,
  /** @public Documented in docs/convention/api.md. */
  ForbiddenError,
  NetworkError,
  TimeoutError,
  UnauthorizedError,
} from "./errors";

// Domain API modules
export * from "./endpoints";
export * from "./game";
export * from "./room";
export * from "./auth";
export * from "./statistics";
export * from "./player";
