import type { Page } from "@playwright/test";

type MockLoginFailureOptions = {
  error?: string;
};

interface ProfileLoginSuccessResponse {
  success: true;
  profile: {
    id: number;
    nickname: string;
    stats: {
      gamesPlayed: number;
      scoreAverage: number;
    };
  };
}

const DEFAULT_INVALID_CREDENTIALS_ERROR = "Incorrect email or password";

export const PROFILE_LOGIN_SUCCESS_RESPONSE: ProfileLoginSuccessResponse = {
  success: true,
  profile: {
    id: 42,
    nickname: "Captain Double",
    stats: {
      gamesPlayed: 18,
      scoreAverage: 56.4,
    },
  },
};

async function mockUnauthenticatedSession(page: Page): Promise<void> {
  await page.context().clearCookies();

  await page.route("**/api/login/success", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ authenticated: false }),
    });
  });
}

export async function mockProfileLoginSuccessFlow(
  page: Page,
  response: ProfileLoginSuccessResponse = PROFILE_LOGIN_SUCCESS_RESPONSE,
): Promise<void> {
  let loginCompleted = false;

  await page.context().clearCookies();

  await page.route("**/api/login/success", async (route) => {
    if (!loginCompleted) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ authenticated: false }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });

  await page.route("**/api/login", async (route) => {
    loginCompleted = true;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ redirect: "/api/login/success" }),
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
