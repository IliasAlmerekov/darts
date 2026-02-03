export class ApiError extends Error {
  status: number;
  data?: unknown;
  url?: string;
  originalError?: unknown;

  constructor(
    message: string,
    options: { status: number; data?: unknown; url?: string; originalError?: unknown },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.data = options.data;
    this.url = options.url;
    this.originalError = options.originalError;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized", data?: unknown, url?: string) {
    super(message, { status: 401, data, url });
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Access denied", data?: unknown, url?: string) {
    super(message, { status: 403, data, url });
    this.name = "ForbiddenError";
  }
}

export class NetworkError extends ApiError {
  constructor(message = "Network request failed", originalError?: unknown) {
    super(message, { status: 0, originalError });
    this.name = "NetworkError";
  }
}
