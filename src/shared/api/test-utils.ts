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
  const responseBody =
    body === undefined || body === null
      ? null
      : typeof body === "string"
        ? body
        : JSON.stringify(body);
  const response = new Response(responseBody, responseInit);

  if (url !== undefined) {
    Object.defineProperty(response, "url", {
      configurable: true,
      value: url,
    });
  }

  if (body !== undefined && typeof body !== "string") {
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
 * `ApiValidationError`.
 */
export function respondWith(payload: unknown): (...args: unknown[]) => Promise<never> {
  return (...args) => {
    const config = args.at(-1);
    const schema =
      typeof config === "object" && config !== null && "validate" in config
        ? config.validate
        : undefined;

    if (schema === undefined) {
      return Promise.reject(new Error("respondWith: the call passed no validate schema"));
    }

    // safe: apiClient's signature ties the parsed output to the schema the caller passed
    return Promise.resolve().then(() => parseResponse(schema as v.GenericSchema, payload) as never);
  };
}
