// spec: specs/ticket-test-plan.md
// seed: tests/start/create-game.spec.ts

import { test, expect } from "@playwright/test";
import { skipWhenAuthCredentialsMissing } from "../shared/auth-test-credentials";
import { addGuestPlayer, createGame, loginAsAdmin } from "../shared/start-page-helpers";

test.describe("Create Game with QR Code", () => {
  skipWhenAuthCredentialsMissing();

  test("Add guest player to created game", async ({ page }) => {
    const guestName = `Guest${Date.now()}`;

    await loginAsAdmin(page);
    await createGame(page);
    await addGuestPlayer(page, guestName);

    await expect(page.getByRole("heading", { name: "Selected Players" })).toBeVisible();
    await expect(page.getByText(guestName)).toBeVisible();
    await expect(page.getByText("1/10")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start" })).toBeDisabled();
  });
});
