// spec: specs/ticket-test-plan.md
// seed: tests/start/create-game.spec.ts

import { test, expect } from "@playwright/test";
import { skipWhenAuthCredentialsMissing } from "./auth-test-credentials";
import { addGuestPlayer, createGame, loginAsAdmin } from "./start-page-helpers";

test.describe("Create Game with QR Code", () => {
  skipWhenAuthCredentialsMissing();

  test("Start game and redirect to game page", async ({ page }) => {
    const firstGuestName = `GuestA${Date.now()}`;
    const secondGuestName = `GuestB${Date.now()}`;

    await loginAsAdmin(page);
    const gameId = await createGame(page);
    await addGuestPlayer(page, firstGuestName);
    await addGuestPlayer(page, secondGuestName);

    const startButton = page.getByRole("button", { name: "Start" });
    await expect(startButton).toBeEnabled();
    await startButton.click();

    await expect(page).toHaveURL(new RegExp(`/game/${gameId}$`));
    await expect(page.locator('img[alt="Undo"]')).toBeVisible();
    await expect(page.getByText(firstGuestName)).toBeVisible();
    await expect(page.getByText(secondGuestName)).toBeVisible();
  });
});
