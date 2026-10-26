import { test, expect } from "../shared/test";
import { mockAdminSession } from "../shared/auth-route-mocks";

const ROUTES_WITH_GAME_ID = ["start", "game", "settings", "summary", "details"] as const;
const INVALID_IDS = ["abc", "0", "-5", "1e3"];
// Only these routes render inside the admin layout, which reads the tablet game for its nav links.
const ADMIN_LAYOUT_ROUTES = new Set(["start", "settings", "details"]);

test.describe("Invalid game id", () => {
  for (const route of ROUTES_WITH_GAME_ID) {
    for (const id of INVALID_IDS) {
      test(`/${route}/${id} shows the not found page and reads no game`, async ({ page }) => {
        await mockAdminSession(page);
        const apiPaths: string[] = [];
        page.on("request", (request) => {
          const { pathname } = new URL(request.url());
          if (pathname.startsWith("/api/")) apiPaths.push(pathname);
        });

        await page.goto(`/${route}/${id}`);

        await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
        expect(apiPaths.filter((path) => path.startsWith("/api/game/"))).toEqual([]);
        if (!ADMIN_LAYOUT_ROUTES.has(route)) {
          expect(apiPaths).not.toContain("/api/tablet/game");
        }
      });
    }
  }

  test("keeps Back to start fully in view under the nav bar at 1024x768", async ({ page }) => {
    await mockAdminSession(page);
    await page.setViewportSize({ width: 1024, height: 768 });

    await page.goto("/start/abc");

    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to start" })).toBeInViewport({ ratio: 1 });
  });
});
