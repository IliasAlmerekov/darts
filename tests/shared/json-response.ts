import type { Route } from "@playwright/test";

/** Answers a mocked request with a 200 JSON body. */
export async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}
