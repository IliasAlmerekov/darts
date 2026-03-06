import type { Page } from "@playwright/test";

type MockLoginFailureOptions = {
  error?: string;
};

const DEFAULT_INVALID_CREDENTIALS_ERROR = "Incorrect email or password";

export async function mockUnauthenticatedSession(page: Page): Promise<void> {
  await page.context().clearCookies();

  await page.route("**/api/login/success", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ authenticated: false }),
    });
  });
}

export async function mockFailedLogin(
  page: Page,
  options: MockLoginFailureOptions = {},
): Promise<void> {
  const error = options.error ?? DEFAULT_INVALID_CREDENTIALS_ERROR;

  await mockUnauthenticatedSession(page);

  await page.route("**/api/login", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error }),
    });
  });
}
