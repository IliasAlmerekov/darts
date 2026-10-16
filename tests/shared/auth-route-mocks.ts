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

/** Credentials typed into the login form in the mocked suite; no backend ever checks them. */
export const MOCK_LOGIN_CREDENTIALS = {
  email: "admin@example.com",
  password: "mocked-password",
} as const;

interface AdminSessionResponse {
  success: true;
  roles: string[];
  id: number;
  username: string;
  redirect: string;
}

const ADMIN_SESSION_RESPONSE: AdminSessionResponse = {
  success: true,
  roles: ["ROLE_ADMIN", "ROLE_PLAYER"],
  id: 1,
  username: "testuser",
  redirect: "/start",
};

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

export async function mockAdminSession(page: Page): Promise<void> {
  await page.route("**/api/login/success", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ADMIN_SESSION_RESPONSE),
    });
  });
}

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

export async function mockProfileLoginSuccessFlow(
  page: Page,
  response: ProfileLoginSuccessResponse = PROFILE_LOGIN_SUCCESS_RESPONSE,
): Promise<void> {
  await mockLoginFlow(page, response);
}

/** Starts signed out; after the login form posts, the session belongs to an admin. */
export async function mockAdminLoginFlow(page: Page): Promise<void> {
  await mockLoginFlow(page, ADMIN_SESSION_RESPONSE);
}

async function mockLoginFlow(
  page: Page,
  sessionResponse: AdminSessionResponse | ProfileLoginSuccessResponse,
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
      body: JSON.stringify(sessionResponse),
    });
  });

  await page.route("**/api/login", async (route) => {
    loginCompleted = true;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      // The controller fallback: the user is logged in, the target comes from /api/login/success.
      body: JSON.stringify({
        success: true,
        id: 1,
        roles: ["ROLE_PLAYER"],
        redirect: "/api/login/success",
      }),
    });
  });
}

type InvitationError =
  | "GAME_ALREADY_STARTED"
  | "GAME_ROOM_FULL"
  | "GAME_NOT_FOUND"
  | "GAME_JOIN_NOT_ALLOWED";

interface RememberedPlayerSessionResponse {
  success: true;
  roles: string[];
  id: number;
  username: string;
  redirect: string;
  gameId?: number;
  invitationError?: InvitationError;
}

/** A player with a Remembered login; the backend redirects players to the Waiting room. */
export const REMEMBERED_PLAYER_RESPONSE: RememberedPlayerSessionResponse = {
  success: true,
  roles: ["ROLE_PLAYER"],
  id: 23,
  username: "Captain Double",
  redirect: "/joined",
};

/** A player with a Remembered login whose invite link the backend joined to `gameId`. */
export const REMEMBERED_PLAYER_JOINED_RESPONSE: RememberedPlayerSessionResponse = {
  ...REMEMBERED_PLAYER_RESPONSE,
  gameId: 42,
};

/** Answers the auth check with a remembered player. */
export async function mockRememberedPlayerSession(
  page: Page,
  response: RememberedPlayerSessionResponse = REMEMBERED_PLAYER_JOINED_RESPONSE,
): Promise<void> {
  await page.route("**/api/login/success", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
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
