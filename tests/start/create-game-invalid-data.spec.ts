// spec: docs/test-plans/ticket-test-plan.md
// seed: tests/start/create-game.spec.ts

import { test, expect } from "../shared/test";
import { loginAsAdmin } from "../shared/start-page-helpers";
import { mockLobbyApi } from "../shared/lobby-route-mocks";

test.describe("Error Handling and Edge Cases", () => {
  test("Handle game creation with invalid data", async ({ page }) => {
    await mockLobbyApi(page);
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
