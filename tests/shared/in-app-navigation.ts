import type { Page } from "@playwright/test";

/** Opens a route without a page load, the way an in-app link does. */
export async function navigateInApp(page: Page, path: string): Promise<void> {
  await page.evaluate((nextPath) => {
    window.history.pushState({}, "", nextPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}
