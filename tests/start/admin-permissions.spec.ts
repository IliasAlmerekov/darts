// spec: specs/ticket-test-plan.md
// seed: tests/start/create-game.spec.ts

import { test, expect, type Page } from "@playwright/test";

async function mockAuthenticatedUser(page: Page, roles: string[]): Promise<void> {
  await page.route("**/api/login/success", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        id: 1,
        email: "test@example.com",
        username: "test-user",
        roles,
        redirect: "/start",
      }),
    });
  });
}

test.describe("User Permissions and Security", () => {
  test("Admin role required for game creation", async ({ page }) => {
    await mockAuthenticatedUser(page, ["ROLE_ADMIN"]);

    await page.goto("http://localhost:5173/start");

    await expect(page).toHaveURL("http://localhost:5173/start");
    await expect(page.getByRole("button", { name: /create game/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create game/i })).toBeEnabled();
    await expect(page.getByRole("heading", { name: "Selected Players" })).toBeVisible();
  });

  test("Player role cannot access game creation", async ({ page }) => {
    await mockAuthenticatedUser(page, ["ROLE_PLAYER"]);

    await page.goto("http://localhost:5173/start");

    await expect(page).toHaveURL("http://localhost:5173/joined");
    await expect(page.getByRole("heading", { name: /spiel beigetreten/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create game/i })).not.toBeVisible();
  });
});
