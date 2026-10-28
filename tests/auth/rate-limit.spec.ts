import { test, expect } from "../shared/test";
import { mockUnauthenticatedSession } from "../shared/auth-route-mocks";

test.describe("Auth rate limits", () => {
  test.beforeEach(async ({ page }) => {
    await mockUnauthenticatedSession(page);
  });

  test("tells the player how long to wait after too many failed logins", async ({ page }) => {
    await page.route("**/api/login", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        headers: { "Retry-After": "120" },
        body: JSON.stringify({
          success: false,
          error: "LOGIN_RATE_LIMITED",
          message: "Too many failed login attempts, please try again in 2 minutes.",
        }),
      });
    });

    await page.goto("/");
    await page.getByRole("textbox", { name: "Email *" }).fill("test@example.com");
    await page.getByRole("textbox", { name: "Password *" }).fill("testpass");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByText("Too many login attempts. Please try again in about 2 minutes."),
    ).toBeVisible();
  });

  test("tells the player to try again later after too many registrations", async ({ page }) => {
    await page.route("**/api/register", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        headers: { "Retry-After": "3600" },
        body: JSON.stringify({
          success: false,
          error: "REGISTRATION_RATE_LIMITED",
          message: "Too many registration attempts.",
        }),
      });
    });

    await page.goto("/register");
    await page.getByRole("textbox", { name: "Username *" }).fill("Captain Double");
    await page.getByRole("textbox", { name: "Email *" }).fill("captain@example.com");
    await page.getByRole("textbox", { name: "Password *" }).fill("Password123!");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("alert")).toHaveText(
      "Too many registration attempts. Please try again later.",
    );
  });
});
