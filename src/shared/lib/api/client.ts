import { ApiError, ForbiddenError, NetworkError, UnauthorizedError } from "./errors";
import type { ApiRequestConfig, QueryParams } from "./types";

const importMetaWithEnv = import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
};
const ENV_API_BASE_URL = importMetaWithEnv.env?.VITE_API_BASE_URL;

function resolveApiBaseUrl(): string {
  if (!ENV_API_BASE_URL) {
    return "/api";
  }

  const normalizedBaseUrl = ENV_API_BASE_URL.trim().replace(/\/+$/, "");
  return normalizedBaseUrl.endsWith("/api") ? normalizedBaseUrl : `${normalizedBaseUrl}/api`;
}

export const API_BASE_URL = resolveApiBaseUrl();

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

async function request<T>(endpoint: string, config: ApiRequestConfig = {}): Promise<T> {
  const { method = "GET", query, body, headers, skipAuthRedirect, ...rest } = config;

  const fetchConfig: RequestInit = {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(isJsonBody(body) && { "Content-Type": "application/json" }),
      ...headers,
    },
    ...rest,
  };

  if (body != null && method !== "GET") {
    fetchConfig.body = isJsonBody(body) ? JSON.stringify(body) : (body as BodyInit);
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(endpoint, query), fetchConfig);
  } catch (error) {
    throw new NetworkError("Network request failed", error);
  }

  const data = response.headers.get("content-type")?.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (response.status === 401) {
    if (!skipAuthRedirect) {
      window.location.href = "/";
    }
    throw new UnauthorizedError("Unauthorized", data, response.url);
  }

  if (response.status === 403) {
    throw new ForbiddenError(data?.error || data?.message || "Access denied", data, response.url);
  }

  if (!response.ok) {
    throw new ApiError(data?.error || data?.message || "Request failed", {
      status: response.status,
      data,
      url: response.url,
    });
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
