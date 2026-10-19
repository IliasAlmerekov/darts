import * as v from "valibot";
import { ApiError, ForbiddenError, NetworkError, TimeoutError, UnauthorizedError } from "./errors";
import type { ApiRequestConfig, QueryParams } from "./types";
import { isRecord } from "@/lib/guards/guards";

const DEFAULT_TIMEOUT_MS = 30_000;
// A private symbol, so a caller that aborts its own signal with "timeout" is not
// mistaken for the client's deadline.
const TIMEOUT_REASON = Symbol("apiClient timeout");

const ENV_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
type AuthRedirectHandler = () => void;
interface ApiResponse<T> {
  data: T;
  response: Response;
}

type ResponseSchema = v.GenericSchema;

type ValidatedApiRequestConfig<TSchema extends ResponseSchema> = ApiRequestConfig & {
  validate: TSchema;
};

let onUnauthorized: AuthRedirectHandler | null = null;

function resolveApiBaseUrl(): string {
  if (!ENV_API_BASE_URL) {
    return "/api";
  }

  const normalizedBaseUrl = ENV_API_BASE_URL.trim().replace(/\/+$/, "");
  return normalizedBaseUrl.endsWith("/api") ? normalizedBaseUrl : `${normalizedBaseUrl}/api`;
}

export const API_BASE_URL = resolveApiBaseUrl();

export class ApiValidationError extends Error {
  constructor(public readonly raw: unknown) {
    super("API response failed validation");
  }
}

/**
 * Parses a response body with its schema and throws `ApiValidationError` with the raw body
 * when it does not match.
 */
export function parseResponse<TSchema extends ResponseSchema>(
  schema: TSchema,
  data: unknown,
): v.InferOutput<TSchema> {
  const result = v.safeParse(schema, data);

  if (!result.success) {
    throw new ApiValidationError(data);
  }

  return result.output;
}

export function setUnauthorizedHandler(handler: AuthRedirectHandler): void {
  if (onUnauthorized !== null) {
    throw new Error("Unauthorized handler is already registered");
  }

  onUnauthorized = handler;
}

export function clearUnauthorizedHandler(): void {
  onUnauthorized = null;
}

function triggerUnauthorizedHandler(): void {
  onUnauthorized?.();
}

function buildUrl(endpoint: string, query?: QueryParams): string {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value != null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

function isJsonBody(body: unknown): boolean {
  return (
    body != null &&
    typeof body !== "string" &&
    !(body instanceof FormData) &&
    !(body instanceof Blob)
  );
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (!isRecord(data)) {
    return fallback;
  }

  if (typeof data.error === "string" && data.error) {
    return data.error;
  }

  if (typeof data.message === "string" && data.message) {
    return data.message;
  }

  return fallback;
}

async function parseResponseData(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205 || response.status === 304) {
    return null;
  }

  return response.headers.get("content-type")?.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);
}

// parseResponseData maps any read failure to null, so an abort while the body is
// still streaming would look like a malformed body. Racing the signal keeps the
// abort reason, and also settles a stalled body that never reacts to the abort.
function readResponseData(response: Response, signal: AbortSignal): Promise<unknown> {
  const abortRejection = new Promise<never>((_resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });

  return Promise.race([parseResponseData(response), abortRejection]);
}

const TOO_MANY_REQUESTS = 429;

// The backend sends Retry-After as whole seconds. The HTTP-date form is not used, so it
// and any other value count as absent.
function readRetryAfterSeconds(response: Response): number | undefined {
  if (response.status !== TOO_MANY_REQUESTS) {
    return undefined;
  }

  const value = response.headers.get("Retry-After")?.trim() ?? "";
  if (!/^\d+$/.test(value)) {
    return undefined;
  }

  const seconds = parseInt(value, 10);
  return seconds > 0 ? seconds : undefined;
}

function isAcceptedStatus(status: number, acceptedStatuses?: number[]): boolean {
  return acceptedStatuses?.includes(status) ?? false;
}

async function request<TSchema extends ResponseSchema>(
  endpoint: string,
  config: ValidatedApiRequestConfig<TSchema> & { returnResponse: true },
): Promise<ApiResponse<v.InferOutput<TSchema>>>;
async function request<TSchema extends ResponseSchema>(
  endpoint: string,
  config: ValidatedApiRequestConfig<TSchema>,
): Promise<v.InferOutput<TSchema>>;
async function request<TSchema extends ResponseSchema>(
  endpoint: string,
  config: ValidatedApiRequestConfig<TSchema>,
): Promise<v.InferOutput<TSchema> | ApiResponse<v.InferOutput<TSchema>>> {
  const {
    method = "GET",
    query,
    body,
    headers,
    skipAuthRedirect,
    timeoutMs,
    acceptedStatuses,
    returnResponse,
    validate,
    ...rest
  } = config;

  const timeoutDuration = timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const externalSignal = rest.signal;

  const abortFromExternal = (): void => controller.abort(externalSignal?.reason);

  if (externalSignal?.aborted) {
    controller.abort(externalSignal.reason);
  } else {
    externalSignal?.addEventListener("abort", abortFromExternal, { once: true });
  }

  const timeoutId = window.setTimeout(() => controller.abort(TIMEOUT_REASON), timeoutDuration);

  const fetchConfig: RequestInit = {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(isJsonBody(body) && { "Content-Type": "application/json" }),
      ...headers,
    },
    ...rest,
    signal: controller.signal,
  };

  if (body != null && method !== "GET") {
    fetchConfig.body = isJsonBody(body) ? JSON.stringify(body) : (body as BodyInit); // safe: BodyInit accepts any serializable value
  }

  const url = buildUrl(endpoint, query);
  let response: Response;
  let data: unknown;

  try {
    response = await fetch(url, fetchConfig);
    data = await readResponseData(response, controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      if (controller.signal.reason === TIMEOUT_REASON) {
        throw new TimeoutError(`Request timed out after ${timeoutDuration}ms`, url);
      }
      // Browsers reject an aborted fetch with the signal's reason; mocks and older
      // engines reject with a fresh AbortError. Anything else is a network failure.
      if (
        error === controller.signal.reason ||
        (error instanceof DOMException && error.name === "AbortError")
      ) {
        throw error;
      }
    }
    throw new NetworkError("Network request failed", error);
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abortFromExternal);
  }

  if (response.status === 401) {
    if (!skipAuthRedirect) {
      triggerUnauthorizedHandler();
    }
    throw new UnauthorizedError("Unauthorized", data, response.url);
  }

  if (response.status === 403) {
    throw new ForbiddenError(getErrorMessage(data, "Access denied"), data, response.url);
  }

  // Under `redirect: "manual"` a 3xx arrives as an opaque redirect with status 0. The
  // caller opted out of following it, so the redirect is the answer. The status and target
  // stay hidden, so the caller accepts that any redirect counts as success.
  const isOpaqueRedirect = response.type === "opaqueredirect";

  if (!response.ok && !isOpaqueRedirect && !isAcceptedStatus(response.status, acceptedStatuses)) {
    throw new ApiError(getErrorMessage(data, "Request failed"), {
      status: response.status,
      data,
      url: response.url,
      retryAfterSeconds: readRetryAfterSeconds(response),
    });
  }

  const validatedData = parseResponse(validate, data);

  if (returnResponse) {
    return {
      data: validatedData,
      response,
    };
  }

  return validatedData;
}

type MethodConfig<TSchema extends ResponseSchema> = Omit<
  ValidatedApiRequestConfig<TSchema>,
  "method" | "body"
>;

export const apiClient = {
  request,
  get: <TSchema extends ResponseSchema>(endpoint: string, config: MethodConfig<TSchema>) =>
    request(endpoint, { ...config, method: "GET" }),

  post: <TSchema extends ResponseSchema>(
    endpoint: string,
    body: unknown,
    config: MethodConfig<TSchema>,
  ) => request(endpoint, { ...config, method: "POST", body }),

  put: <TSchema extends ResponseSchema>(
    endpoint: string,
    body: unknown,
    config: MethodConfig<TSchema>,
  ) => request(endpoint, { ...config, method: "PUT", body }),

  patch: <TSchema extends ResponseSchema>(
    endpoint: string,
    body: unknown,
    config: MethodConfig<TSchema>,
  ) => request(endpoint, { ...config, method: "PATCH", body }),

  delete: <TSchema extends ResponseSchema>(
    endpoint: string,
    config: Omit<ValidatedApiRequestConfig<TSchema>, "method">,
  ) => request(endpoint, { ...config, method: "DELETE" }),
};
