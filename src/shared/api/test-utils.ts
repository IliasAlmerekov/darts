import type * as v from "valibot";
import { parseResponse } from "./client";

type MockResponseOptions = {
  body?: unknown;
  headers?: HeadersInit;
  status?: number;
  url?: string;
};

export function createMockResponse({
  body,
  headers,
  status = 200,
  url,
}: MockResponseOptions = {}): Response {
  const responseInit: ResponseInit = {
    status,
    ...(headers === undefined ? {} : { headers }),
  };
  const isStream = body instanceof ReadableStream;
  const responseBody =
    body === undefined || body === null
      ? null
      : typeof body === "string" || isStream
        ? body
        : JSON.stringify(body);
  const response = new Response(responseBody, responseInit);

  if (url !== undefined) {
    Object.defineProperty(response, "url", {
      configurable: true,
      value: url,
    });
  }

  if (body !== undefined && typeof body !== "string" && !isStream) {
    Object.defineProperty(response, "json", {
      configurable: true,
      value: () => Promise.resolve(body),
    });
  }

  return response;
}

/**
 * Mock implementation for an `apiClient` method. It parses `payload` with the schema the
 * caller passed in `validate`, as the real client does, so a malformed payload rejects with
 * `ApiValidationError`. A call with `returnResponse: true` resolves to `{ data, response }`;
 * `response` defaults to a 200 JSON response carrying `payload`.
 */
export function respondWith(
  payload: unknown,
  response?: Response,
): (...args: unknown[]) => Promise<never> {
  return (...args) => {
    const config = args.at(-1);

    if (typeof config !== "object" || config === null || !("validate" in config)) {
      return Promise.reject(new Error("respondWith: the call passed no validate schema"));
    }

    const returnResponse = "returnResponse" in config && config.returnResponse === true;

    return Promise.resolve().then(() => {
      // safe: apiClient's signature ties the parsed output to the schema the caller passed
      const data: unknown = parseResponse(config.validate as v.GenericSchema, payload);
      const result = returnResponse
        ? { data, response: response ?? createMockResponse({ body: payload }) }
        : data;
      // safe: the caller's apiClient signature already types this result
      return result as never;
    });
  };
}
