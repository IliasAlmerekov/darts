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
