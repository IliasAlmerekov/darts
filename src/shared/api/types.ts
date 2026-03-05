export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryValue = string | number | boolean | null | undefined;

export type QueryParams = Record<string, QueryValue>;

export interface ApiRequestConfig extends Omit<RequestInit, "body" | "method" | "headers"> {
  method?: HttpMethod;
  query?: QueryParams;
  body?: unknown;
  headers?: HeadersInit;
  skipAuthRedirect?: boolean;
}

export type ErrorPayload = {
  error?: string;
  message?: string;
  [key: string]: unknown;
};
