type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type QueryValue = string | number | boolean | null | undefined;

export type QueryParams = Record<string, QueryValue>;

export interface ApiRequestConfig extends Omit<
  RequestInit,
  "body" | "method" | "headers" | "signal"
> {
  method?: HttpMethod;
  query?: QueryParams | undefined;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal | null | undefined;
  skipAuthRedirect?: boolean;
  timeoutMs?: number;
  acceptedStatuses?: number[];
  returnResponse?: boolean;
}
