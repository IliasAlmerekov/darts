import { expect, type Page } from "@playwright/test";
import { MOCK_LOGIN_CREDENTIALS, mockAdminLoginFlow } from "./auth-route-mocks";

export async function loginAsAdmin(page: Page): Promise<void> {
  const { email: testEmail, password: testPassword } = MOCK_LOGIN_CREDENTIALS;

  await mockAdminLoginFlow(page);
  await page.goto("/");
  await page.getByText("Sign in").first().waitFor({ state: "visible" });
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await page.getByRole("textbox", { name: "Email *" }).fill(testEmail);
  await page.getByRole("textbox", { name: "Password *" }).fill(testPassword);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL("/start");
}

export async function createGame(page: Page): Promise<number> {
  const createGameButton = page.locator("button:visible", { hasText: /^create game$/i });

  await expect(createGameButton).toHaveCount(1);
  await createGameButton.click();

  await expect(page).toHaveURL(/\/start\/\d+$/);
  await expect(
    page.getByRole("heading", { name: "Scan the QR code to join the game" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy Invite Link" })).toBeVisible();

  const gameIdMatch = page.url().match(/\/start\/(\d+)$/);
  if (!gameIdMatch) {
    throw new Error(`Expected start page URL with game id, received "${page.url()}"`);
  }

  return Number(gameIdMatch[1]);
}

export async function addGuestPlayer(page: Page, username: string): Promise<void> {
  const addGuestButton = page.getByRole("button", { name: "Play as a guest" });

  await expect(addGuestButton).toBeVisible();
  await expect(addGuestButton).toBeEnabled();
  await addGuestButton.click();

  await expect(page.getByRole("heading", { name: "Play as a guest" })).toBeVisible();

  const usernameField = page.getByLabel("Username");
  await usernameField.fill(username);
  await page.getByRole("button", { name: /^Add$/ }).click();

  await expect(page.getByText(username)).toBeVisible();
}
