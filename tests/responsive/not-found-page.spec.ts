import { test, expect } from "../shared/test";
import { mockUnauthenticatedSession } from "../shared/auth-route-mocks";

test.describe("Not found page", () => {
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 1024, height: 768 },
    { width: 1200, height: 1000 },
  ]) {
    test(`fits a ${viewport.width}x${viewport.height} screen with the link in view and no horizontal scroll`, async ({
      page,
    }) => {
      await mockUnauthenticatedSession(page);
      await page.setViewportSize(viewport);
      await page.goto("/no-such-page");

      await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
      const backLink = page.getByRole("link", { name: "Back to start" });
      await expect(backLink).toBeInViewport({ ratio: 1 });

      const hasHorizontalScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(hasHorizontalScroll).toBe(false);
    });
  }
});
