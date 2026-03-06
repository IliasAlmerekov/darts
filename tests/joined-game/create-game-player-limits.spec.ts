// spec: specs/ticket-test-plan.md
// seed: tests/start/create-game.spec.ts

import { test, expect } from "@playwright/test";
import { skipWhenAuthCredentialsMissing } from "./auth-test-credentials";
import { addGuestPlayer, createGame, loginAsAdmin } from "./start-page-helpers";

test.describe("Error Handling and Edge Cases", () => {
  skipWhenAuthCredentialsMissing();

  test("Maximum players limit enforcement", async ({ page }) => {
    await loginAsAdmin(page);
    await createGame(page);

    for (let i = 1; i <= 10; i += 1) {
      await addGuestPlayer(page, `GuestPlayer${i}`);
    }

    const addGuestButton = page.getByRole("button", { name: "Play as a guest" });

    await expect(page.getByText("10/10 Full")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Room is full" })).toBeVisible();
    await expect(addGuestButton).toBeDisabled();
  });
});
