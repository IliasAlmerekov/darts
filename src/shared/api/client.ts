import { API_BASE_URL } from "./config";
import { ApiError, NetworkError, UnauthorizedError } from "./errors";
import type { ApiRequestConfig, QueryParams } from "./types";

const DEFAULT_HEADERS: HeadersInit = {
  Accept: "application/json",
};

const BASE_ORIGIN = typeof window !== "undefined" ? window.location.origin : "http://localhost";

const normalizeBaseUrl = (base: string): string => base.replace(/\/+$/, "");

const normalizeEndpoint = (endpoint: string): string =>
  endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

const buildUrl = (endpoint: string, query?: QueryParams): string => {
  const url = new URL(
    `${normalizeBaseUrl(API_BASE_URL)}${normalizeEndpoint(endpoint)}`,
    BASE_ORIGIN,
  );

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      url.searchParams.append(key, String(value));
    });
  }

  return url.toString();
};

const shouldSendJson = (body: unknown): boolean => {
  if (body === undefined || body === null) {
    return false;
  }

  if (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  ) {
    return false;
  }

  return true;
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type");

  if (response.status === 204) {
    return null;
  }

  if (contentType?.includes("application/json")) {
    return response.json().catch(() => null);
  }

  return response.text().catch(() => null);
};

const extractErrorMessage = (payload: unknown, fallback: string): string => {
  if (payload && typeof payload === "object") {
    const { error, message } = payload as Record<string, unknown>;

    if (typeof error === "string" && error.trim()) {
      return error;
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  return fallback;
};

async function handleResponse<T>(response: Response, skipAuthRedirect?: boolean): Promise<T> {
  const payload = await parseResponseBody(response);

  if (response.status === 401) {
    if (!skipAuthRedirect && typeof window !== "undefined") {
      window.location.href = "/";
    }

    throw new UnauthorizedError("Unauthorized", payload, response.url);
  }

  if (!response.ok) {
    const message = extractErrorMessage(payload, "Request failed");
    throw new ApiError(message, { status: response.status, data: payload, url: response.url });
  }

  return payload as T;
}

async function request<T>(endpoint: string, config: ApiRequestConfig = {}): Promise<T> {
  const { method = "GET", query, body, headers, skipAuthRedirect, ...rest } = config;

  const init: RequestInit = {
    method,
    credentials: "include",
    headers: {
      ...DEFAULT_HEADERS,
      ...(shouldSendJson(body) ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...rest,
  };

  if (body !== undefined && method !== "GET") {
    init.body = shouldSendJson(body) ? JSON.stringify(body) : (body as BodyInit);
  }

  const url = buildUrl(endpoint, query);

  try {
    const response = await fetch(url, init);
    return await handleResponse<T>(response, skipAuthRedirect);
  } catch (error) {
    if (error instanceof ApiError || error instanceof UnauthorizedError) {
      throw error;
    }

    throw new NetworkError("Network request failed", error);
  }
}

type ApiConfigWithoutBody = Omit<ApiRequestConfig, "method" | "body">;
type ApiConfigWithBody = Omit<ApiRequestConfig, "method">;

export const apiClient = {
  request,
  get: <T>(endpoint: string, config?: ApiConfigWithoutBody) =>
    request<T>(endpoint, { ...config, method: "GET" }),
  post: <T>(endpoint: string, body?: unknown, config?: ApiConfigWithoutBody) =>
    request<T>(endpoint, { ...config, method: "POST", body }),
  put: <T>(endpoint: string, body?: unknown, config?: ApiConfigWithoutBody) =>
    request<T>(endpoint, { ...config, method: "PUT", body }),
  patch: <T>(endpoint: string, body?: unknown, config?: ApiConfigWithoutBody) =>
    request<T>(endpoint, { ...config, method: "PATCH", body }),
  delete: <T>(endpoint: string, config?: ApiConfigWithBody) =>
    request<T>(endpoint, { ...config, method: "DELETE" }),
};
