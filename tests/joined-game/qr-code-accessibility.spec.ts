// spec: specs/ticket-test-plan.md
// seed: tests/start/create-game.spec.ts

import { test, expect } from "@playwright/test";
import { createGame, loginAsAdmin } from "./start-page-helpers";

test.describe("QR Code Functionality", () => {
  test("QR code accessibility and usability", async ({ page }) => {
    await loginAsAdmin(page);

    const gameId = await createGame(page);
    const qrCode = page.locator('[class*="qrCodeContainer"] svg');

    await expect(
      page.getByRole("heading", { name: "Scan the QR code to join the game" }),
    ).toBeVisible();
    await expect(qrCode).toBeVisible();
    await expect(page.getByText("GAME ID")).toBeVisible();
    await expect(page.getByText(`#${gameId}`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy Invite Link" })).toBeVisible();

    await page.setViewportSize({ width: 375, height: 667 });
    await expect(qrCode).toBeVisible();

    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(qrCode).toBeVisible();

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(qrCode).toBeVisible();
  });
});
