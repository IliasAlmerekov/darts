import { test, expect, type BrowserContext } from "@playwright/test";

const PLAYER_PASSWORD = "Secret123!";

async function hasRememberMeCookie(context: BrowserContext): Promise<boolean> {
  const cookies = await context.cookies();
  return cookies.some((cookie) => cookie.name === "REMEMBERME");
}

test.describe("Player logout", () => {
  test("Log out in the Waiting room ends the Remembered login", async ({
    page,
    context,
    request,
  }) => {
    // A fresh player per run. `request` keeps its own cookies, so the browser starts logged out.
    const suffix = `${Date.now()}`;
    const email = `pw-logout-${suffix}@example.com`;
    const registration = await request.post("/api/register", {
      data: { username: `pwlogout${suffix}`, email, plainPassword: PLAYER_PASSWORD },
    });
    expect(registration.ok()).toBe(true);

    await page.goto("/");
    await page.getByRole("textbox", { name: "Email *" }).fill(email);
    await page.getByLabel("Password *").fill(PLAYER_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/joined");
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
