// spec: docs/test-plans/login-test-plan.md
// seed: tests/shared/seed.spec.ts

import { test, expect, type Route } from "../shared/test";
import { MOCK_LOGIN_CREDENTIALS, mockAdminLoginFlow } from "../shared/auth-route-mocks";

test.describe("Error Handling and Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminLoginFlow(page);
  });

  test("Network Error Handling", async ({ page }) => {
    const { email: testEmail, password: testPassword } = MOCK_LOGIN_CREDENTIALS;

    // 1. Navigate to login page and fill valid credentials
    await page.goto("/");

    // Verify form is ready for submission
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    // Fill valid credentials
    await page.getByRole("textbox", { name: "Email *" }).fill(testEmail);
    await page.getByRole("textbox", { name: "Password *" }).fill(testPassword);

    // 2. Block network requests to simulate network error
    const abortLogin = (route: Route) => route.abort("failed");
    await page.route("**/api/login", abortLogin);

    // Attempt to submit the form
    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify network error message is displayed
    await expect(
      page.getByText("Network error. Please check your connection and try again."),
    ).toBeVisible();

    // Verify form remains accessible
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeEnabled();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();

    // Verify credentials are preserved
    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveValue(testEmail);
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveValue(testPassword);

    // 3. Restore network and retry submission
    await page.unroute("**/api/login", abortLogin);

    // Retry submission
    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify login succeeds normally and error message disappears
    await expect(page).toHaveURL("/start");
    await expect(
      page.getByText("Network error. Please check your connection and try again."),
    ).not.toBeVisible();
  });
});
