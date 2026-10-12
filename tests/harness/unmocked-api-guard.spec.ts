import { test, expect } from "../shared/test";

test.describe("Unmocked API guard", () => {
  test.describe("with failure reporting disabled", () => {
    test.use({ failOnUnmockedApi: false });

    test("records API requests that no route mock handles", async ({
      page,
      unmockedApiRequests,
    }) => {
      await page.goto("/");

      await expect.poll(() => unmockedApiRequests).toContain("GET /api/login/success");
    });
  });

  test("fails the test when an API request has no route mock", async ({ page }) => {
    test.fail();

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });
});
