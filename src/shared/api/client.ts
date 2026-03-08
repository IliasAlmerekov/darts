import { ApiError, ForbiddenError, NetworkError, TimeoutError, UnauthorizedError } from "./errors";
import type { ApiRequestConfig, QueryParams } from "./types";

const DEFAULT_TIMEOUT_MS = 30_000;

const ENV_API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;
export type AuthRedirectHandler = () => void;
interface ApiResponse<T> {
  data: T;
  response: Response;
}

let onUnauthorized: AuthRedirectHandler | null = null;

function resolveApiBaseUrl(): string {
  if (!ENV_API_BASE_URL) {
    return "/api";
  }

  const normalizedBaseUrl = ENV_API_BASE_URL.trim().replace(/\/+$/, "");
  return normalizedBaseUrl.endsWith("/api") ? normalizedBaseUrl : `${normalizedBaseUrl}/api`;
}

export const API_BASE_URL = resolveApiBaseUrl();

export function setUnauthorizedHandler(handler: AuthRedirectHandler): void {
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
  if (typeof data !== "object" || data === null) {
    return fallback;
  }

  const errorPayload = data as { error?: unknown; message?: unknown };
  if (typeof errorPayload.error === "string" && errorPayload.error) {
    return errorPayload.error;
  }

  if (typeof errorPayload.message === "string" && errorPayload.message) {
    return errorPayload.message;
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

function isAcceptedStatus(status: number, acceptedStatuses?: number[]): boolean {
  return acceptedStatuses?.includes(status) ?? false;
}

async function request<T>(
  endpoint: string,
  config: ApiRequestConfig & { returnResponse: true },
): Promise<ApiResponse<T>>;
async function request<T>(endpoint: string, config?: ApiRequestConfig): Promise<T>;
async function request<T>(
  endpoint: string,
  config: ApiRequestConfig = {},
): Promise<T | ApiResponse<T>> {
  const {
    method = "GET",
    query,
    body,
    headers,
    skipAuthRedirect,
    timeoutMs,
    acceptedStatuses,
    returnResponse,
    ...rest
  } = config;

  const timeoutDuration = timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const externalSignal = rest.signal;

  if (externalSignal?.aborted) {
    controller.abort(externalSignal.reason);
  } else {
    externalSignal?.addEventListener("abort", () => controller.abort(externalSignal.reason), {
      once: true,
    });
  }

  const timeoutId = window.setTimeout(() => controller.abort("timeout"), timeoutDuration);

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
    fetchConfig.body = isJsonBody(body) ? JSON.stringify(body) : (body as BodyInit);
  }

  const url = buildUrl(endpoint, query);
  let response: Response;

  try {
    response = await fetch(url, fetchConfig);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      if (controller.signal.reason === "timeout") {
        throw new TimeoutError(`Request timed out after ${timeoutDuration}ms`, url);
      }
      throw error;
    }
    throw new NetworkError("Network request failed", error);
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await parseResponseData(response);

  if (response.status === 401) {
    if (!skipAuthRedirect) {
      triggerUnauthorizedHandler();
    }
    throw new UnauthorizedError("Unauthorized", data, response.url);
  }

  if (response.status === 403) {
    throw new ForbiddenError(getErrorMessage(data, "Access denied"), data, response.url);
  }

  if (!response.ok && !isAcceptedStatus(response.status, acceptedStatuses)) {
    throw new ApiError(getErrorMessage(data, "Request failed"), {
      status: response.status,
      data,
      url: response.url,
    });
  }

  if (returnResponse) {
    return {
      data: data as T,
      response,
    };
  }

  return data as T;
}

export const apiClient = {
  request,
  get: <T>(endpoint: string, config?: Omit<ApiRequestConfig, "method" | "body">) =>
    request<T>(endpoint, { ...config, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, config?: Omit<ApiRequestConfig, "method" | "body">) =>
    request<T>(endpoint, { ...config, method: "POST", body }),

  put: <T>(endpoint: string, body?: unknown, config?: Omit<ApiRequestConfig, "method" | "body">) =>
    request<T>(endpoint, { ...config, method: "PUT", body }),

  patch: <T>(
    endpoint: string,
    body?: unknown,
    config?: Omit<ApiRequestConfig, "method" | "body">,
  ) => request<T>(endpoint, { ...config, method: "PATCH", body }),

  delete: <T>(endpoint: string, config?: Omit<ApiRequestConfig, "method">) =>
    request<T>(endpoint, { ...config, method: "DELETE" }),
};
