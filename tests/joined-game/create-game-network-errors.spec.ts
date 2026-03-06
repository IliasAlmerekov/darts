// spec: specs/ticket-test-plan.md
// seed: tests/start/create-game.spec.ts

import { test, expect } from "@playwright/test";
import { skipWhenAuthCredentialsMissing } from "./auth-test-credentials";
import { createGame, loginAsAdmin } from "./start-page-helpers";

test.describe("Error Handling and Edge Cases", () => {
  skipWhenAuthCredentialsMissing();

  test("Handle network failures during game creation", async ({ page }) => {
    await loginAsAdmin(page);

    await page.route("**/api/room/create", async (route) => {
      await route.abort("failed");
    });

    const createGameButton = page.locator("button:visible", { hasText: /^create game$/i });
    await createGameButton.click();

    const errorState = page.getByRole("alert");
    await expect(errorState).toContainText("Start page action failed");
    await expect(errorState).toContainText(
      "Network error. Please check your connection and try again.",
    );

    await page.unroute("**/api/room/create");
    await page.getByRole("button", { name: "Dismiss" }).click();

    await createGame(page);
  });
});
