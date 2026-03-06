// spec: specs/ticket-test-plan.md
// seed: tests/start/create-game.spec.ts

import { test, expect } from "@playwright/test";
import { skipWhenAuthCredentialsMissing } from "./auth-test-credentials";
import { createGame, loginAsAdmin } from "./start-page-helpers";

test.describe("Create Game with QR Code", () => {
  skipWhenAuthCredentialsMissing();

  test("Create new game successfully with QR code generation", async ({ page }) => {
    await loginAsAdmin(page);

    const gameId = await createGame(page);

    await expect(page.getByRole("button", { name: "Created" })).toBeDisabled();
    await expect(page.getByRole("heading", { name: "Selected Players" })).toBeVisible();
    await expect(page.getByText("GAME ID")).toBeVisible();
    await expect(page.getByText(`#${gameId}`)).toBeVisible();
    await expect(page.locator('[class*="qrCodeContainer"] svg')).toBeVisible();
  });
});
