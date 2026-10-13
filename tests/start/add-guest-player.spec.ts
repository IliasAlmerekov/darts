// spec: specs/ticket-test-plan.md
// seed: tests/start/create-game.spec.ts

import { test, expect } from "../shared/test";
import { addGuestPlayer, createGame, loginAsAdmin } from "../shared/start-page-helpers";
import { mockLobbyApi } from "../shared/lobby-route-mocks";

test.describe("Create Game with QR Code", () => {
  test("Add guest player to created game", async ({ page }) => {
    const guestName = `Guest${Date.now()}`;

    await mockLobbyApi(page);
    await loginAsAdmin(page);
    await createGame(page);
    await addGuestPlayer(page, guestName);

    await expect(page.getByRole("heading", { name: "Selected Players" })).toBeVisible();
    await expect(page.getByText(guestName)).toBeVisible();
    await expect(page.getByText("1/10")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start" })).toBeDisabled();
  });
});
