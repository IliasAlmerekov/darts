import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../shared/start-page-helpers";

test.describe("Pre-create game settings", () => {
  test("sends selected settings when creating a room after editing /settings", async ({ page }) => {
    let createRoomPayload: Record<string, unknown> | null = null;

    await loginAsAdmin(page);
    await page.goto("http://localhost:5173/settings");

    await page.getByRole("button", { name: "Double-out" }).click();
    await page.getByRole("button", { name: "501" }).click();

    await page.goto("http://localhost:5173/start");

    await page.route("**/api/room/create", async (route, request) => {
      createRoomPayload = request.postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, gameId: 520 }),
      });
    });

    await page.route("**/api/invite/create/520", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ gameId: 520, invitationLink: "/invite/520" }),
      });
    });

    await page.getByRole("button", { name: /^create game$/i }).click();

    await expect(page).toHaveURL("http://localhost:5173/start/520");
    expect(createRoomPayload).toEqual({
      startScore: 501,
      doubleOut: true,
      tripleOut: false,
    });
  });
});
