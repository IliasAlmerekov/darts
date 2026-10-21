import { test, expect } from "../shared/test";
import { mockUnauthenticatedSession } from "../shared/auth-route-mocks";

test.describe("Registration email domain", () => {
  test.beforeEach(async ({ page }) => {
    await mockUnauthenticatedSession(page);
  });

  test("sends an address on another domain and shows the backend's @db-n.com rule", async ({
    page,
  }) => {
    const registerEmails: unknown[] = [];
    await page.route("**/api/register", async (route) => {
      registerEmails.push(route.request().postDataJSON()?.email);
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          errors: { email: ["Please register with your @db-n.com email address"] },
        }),
      });
    });

    await page.goto("/register");
    await expect(page.getByText("Use your @db-n.com email address.")).toBeVisible();

    await page.getByRole("textbox", { name: "Username *" }).fill("Alice");
    await page.getByRole("textbox", { name: "Email *" }).fill("alice@gmail.com");
    await page.getByRole("textbox", { name: "Password *" }).fill("123456");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("alert")).toHaveText(
      "Only @db-n.com email addresses can register.",
    );
    expect(registerEmails).toEqual(["alice@gmail.com"]);
  });
});
