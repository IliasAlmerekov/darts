const SENSITIVE_KEY_PATTERN =
  /authorization|cookie|csrf|invitationlink|password|secret|session|token/i;

type ClientLogLevel = "warn" | "error";

type ClientLogSink = Pick<Console, ClientLogLevel>;

type ClientLogDetails = Record<string, unknown> & {
  error?: unknown;
};

export interface ClientLogger {
  warn(event: string, details?: ClientLogDetails): void;
  error(event: string, details?: ClientLogDetails): void;
}

type SerializedClientLogError = {
  name: string;
  message: string;
  stack?: string;
};

export const REDACTED_VALUE = "[REDACTED]";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizePayloadInternal(value: unknown, seen: WeakSet<object>): unknown {
  if (value instanceof Error) {
    return serializeClientLogError(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayloadInternal(item, seen));
  }

  if (!isRecord(value)) {
    return value;
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  seen.add(value);

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? REDACTED_VALUE : sanitizePayloadInternal(nestedValue, seen),
    ]),
  );
}

export function sanitizeClientLogPayload(value: unknown): unknown {
  return sanitizePayloadInternal(value, new WeakSet<object>());
}

export function serializeClientLogError(error: unknown): SerializedClientLogError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }

  return {
    name: "NonError",
    message: String(error),
  };
}

function emitClientLog(
  sink: ClientLogSink,
  level: ClientLogLevel,
  event: string,
  details?: ClientLogDetails,
): void {
  const { error, ...metadata } = details ?? {};
  const sanitizedMetadata = sanitizeClientLogPayload(metadata);
  const payload = {
    ...(isRecord(sanitizedMetadata) ? sanitizedMetadata : {}),
    ...(error !== undefined ? { error: serializeClientLogError(error) } : {}),
  };

  if (Object.keys(payload).length === 0) {
    sink[level](`[client:${level}] ${event}`);
    return;
  }

  sink[level](`[client:${level}] ${event}`, payload);
}

export function createClientLogger(sink: ClientLogSink = console): ClientLogger {
  return {
    warn: (event: string, details?: ClientLogDetails): void => {
      emitClientLog(sink, "warn", event, details);
    },
    error: (event: string, details?: ClientLogDetails): void => {
      emitClientLog(sink, "error", event, details);
    },
  };
}

export const clientLogger = createClientLogger();
