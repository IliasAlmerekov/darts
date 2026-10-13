// spec: specs/ticket-test-plan.md
// seed: tests/start/create-game.spec.ts

import { test, expect } from "../shared/test";
import { createGame, loginAsAdmin } from "../shared/start-page-helpers";
import { mockLobbyApi } from "../shared/lobby-route-mocks";

test.describe("Error Handling and Edge Cases", () => {
  test("Handle network failures during game creation", async ({ page }) => {
    await mockLobbyApi(page);
    await loginAsAdmin(page);

    await page.route("**/api/room/create", async (route) => {
      await route.abort("failed");
    });

    const createGameButton = page.getByRole("button", { name: /^create game$/i });
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
