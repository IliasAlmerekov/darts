// spec: specs/ticket-test-plan.md
// seed: tests/start/create-game.spec.ts

import { test, expect } from "@playwright/test";
import { skipWhenAuthCredentialsMissing } from "../shared/auth-test-credentials";
import { loginAsAdmin } from "../shared/start-page-helpers";

test.describe("Error Handling and Edge Cases", () => {
  skipWhenAuthCredentialsMissing();

  test("Handle game creation with invalid data", async ({ page }) => {
    await loginAsAdmin(page);

    await page.route("**/api/room/create", async (route) => {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({
          error: "VALIDATION_FAILED",
          message: "Submitted game setup is invalid.",
        }),
      });
    });

    await page.locator("button:visible", { hasText: /^create game$/i }).click();

    const errorState = page.getByRole("alert");
    await expect(errorState).toContainText("Start page action failed");
    await expect(errorState).toContainText("VALIDATION_FAILED");
    await expect(page.getByRole("button", { name: "Dismiss" })).toBeVisible();

    await page.unroute("**/api/room/create");
  });
});
