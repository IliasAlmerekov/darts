import { test, expect, type APIRequestContext, type BrowserContext } from "@playwright/test";
import { getAuthTestCredentials } from "../shared/auth-test-credentials";

const PLAYER_PASSWORD = "Secret123!";

async function hasRememberMeCookie(context: BrowserContext): Promise<boolean> {
  const cookies = await context.cookies();
  return cookies.some((cookie) => cookie.name === "REMEMBERME");
}

interface RoomInvitation {
  gameId: number;
  invitationLink: string;
}

/** The test admin opens a room and returns its invitation. */
async function openRoomInvitation(adminRequest: APIRequestContext): Promise<RoomInvitation> {
  const { email, password } = getAuthTestCredentials();
  const login = await adminRequest.post("/api/login", {
    form: { _username: email, _password: password },
  });
  expect(login.ok()).toBe(true);

  const room = await adminRequest.post("/api/room/create", { data: {} });
  expect(room.ok()).toBe(true);
  const { gameId } = (await room.json()) as { gameId: number };

  const invite = await adminRequest.post(`/api/invite/create/${gameId}`);
  expect(invite.ok()).toBe(true);
  const { invitationLink } = (await invite.json()) as { invitationLink: string };
  return { gameId, invitationLink };
}

test.describe("Player logout", () => {
  test("Log out in the Waiting room ends the Remembered login", async ({
    page,
    context,
    request,
    playwright,
    baseURL,
  }) => {
    // A fresh player per run. `request` keeps its own cookies, so the browser starts logged out.
    const suffix = `${Date.now()}`;
    const email = `pw-logout-${suffix}@example.com`;
    const registration = await request.post("/api/register", {
      data: { username: `pwlogout${suffix}`, email, plainPassword: PLAYER_PASSWORD },
    });
    expect(registration.ok()).toBe(true);

    // The Waiting room sends a player without a current game to the profile, so the player
    // scans an invitation before logging in.
    const adminRequest = await playwright.request.newContext(baseURL ? { baseURL } : {});
    const { gameId, invitationLink } = await openRoomInvitation(adminRequest);
    await adminRequest.dispose();

    await page.goto(invitationLink);
    await page.getByRole("textbox", { name: "Email *" }).fill(email);
    await page.getByLabel("Password *").fill(PLAYER_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/joined");
    // The game id shows only once the server answers that the player waits in this room.
    await expect(page.getByText(`Game #${gameId}`)).toBeVisible();
    expect(await hasRememberMeCookie(context)).toBe(true);

    await page.getByRole("button", { name: "Log out" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    expect(await hasRememberMeCookie(context)).toBe(false);

    await page.goBack();
    await expect(page).not.toHaveURL("/joined");

    await page.goto("/");
    await page.reload();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Joined game" })).toHaveCount(0);
  });
});
