import { test, expect } from "../shared/test";
import { mockUnauthenticatedSession } from "../shared/auth-route-mocks";

test.describe("Registration password minimum", () => {
  test.beforeEach(async ({ page }) => {
    await mockUnauthenticatedSession(page);
  });

  test("does not send a password shorter than 8 characters", async ({ page }) => {
    let registerRequests = 0;
    await page.route("**/api/register", async (route) => {
      registerRequests += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await page.goto("/register");
    await expect(page.getByText("At least 8 characters.")).toBeVisible();

    await page.getByRole("textbox", { name: "Username *" }).fill("Captain Double");
    await page.getByRole("textbox", { name: "Email *" }).fill("captain@example.com");
    await page.getByRole("textbox", { name: "Password *" }).fill("1234567");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("textbox", { name: "Password *" })).toBeFocused();
    await expect(page).toHaveURL("/register");
    expect(registerRequests).toBe(0);
  });

  test("shows the minimum when the backend rejects a short password", async ({ page }) => {
    await page.route("**/api/register", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          errors: { plainPassword: "Your password should be at least 8 characters long." },
        }),
      });
    });

    await page.goto("/register");
    await page.getByRole("textbox", { name: "Username *" }).fill("Captain Double");
    await page.getByRole("textbox", { name: "Email *" }).fill("captain@example.com");
    await page.getByRole("textbox", { name: "Password *" }).fill("12345678");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("alert")).toHaveText("Password must be at least 8 characters.");
  });
});
