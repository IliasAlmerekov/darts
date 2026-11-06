import { test, expect } from "../shared/test";
import {
  MOCK_LOGIN_CREDENTIALS,
  mockPlayerLoginFlow,
  mockRememberedPlayerSession,
  REMEMBERED_PLAYER_RESPONSE,
} from "../shared/auth-route-mocks";
import { mockPlayerProfile, PLAYER_PROFILE } from "../shared/player-profile-mocks";

/** A Very low step's dot strength: the 0.45 floor plus the step's share, never faded out. */
const VERY_LOW_DOT_OPACITY = 0.516;

test.describe("Player profile", () => {
  test("a player who logs in reaches the profile and sees their stats", async ({ page }) => {
    const { email, password } = MOCK_LOGIN_CREDENTIALS;
    await mockPlayerLoginFlow(page);
    await mockPlayerProfile(page);

    await page.goto("/");
    await page.getByRole("textbox", { name: "Email *" }).fill(email);
    await page.getByRole("textbox", { name: "Password *" }).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/playerprofile");
    await expect(page.getByRole("heading", { level: 1, name: "Player Profile" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Captain Double" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Games played" })).toContainText(
      String(PLAYER_PROFILE.stats.gamesPlayed),
    );
    await expect(page.getByRole("group", { name: "three-dart average" })).toContainText(
      "Ø AVG56.40",
    );
    await expect(page.getByRole("img", { name: /^Scoring trend chart/ })).toBeVisible();
  });

  test("History lists the recent games and keeps the tab in the URL", async ({ page }) => {
    await mockRememberedPlayerSession(page, {
      ...REMEMBERED_PLAYER_RESPONSE,
      redirect: "/playerprofile",
    });
    await mockPlayerProfile(page);

    await page.goto("/playerprofile");
    await page.getByRole("tab", { name: "History" }).click();

    await expect(page).toHaveURL("/playerprofile?tab=history");
    const games = page.getByRole("list", { name: "Recent games" });
    await expect(games).toContainText("2nd of 3 · Ø AVG 45.30");
    await expect(games).toContainText("2. Captain Double (you)");
    await expect(games).toContainText("3. Guest");
  });

  test("the hit dots of the least hit board fields stay visible", async ({ page }) => {
    await mockRememberedPlayerSession(page, {
      ...REMEMBERED_PLAYER_RESPONSE,
      redirect: "/playerprofile",
    });
    await mockPlayerProfile(page);

    await page.goto("/playerprofile");

    const dots = page
      .getByRole("region", { name: "Hit distribution" })
      .locator('svg g[aria-hidden="true"] > circle');
    await expect(dots.first()).toBeAttached();
    // PLAYER_PROFILE gives T20 96 hits and every other board field 12: T20 is the Very high
    // step and draws at full strength, the number fields are Very low (12 / 96), and the
    // centre's 24 hits are Low.
    const opacities = (): Promise<number[]> =>
      dots.evaluateAll((circles) =>
        circles.map((circle) => Number(getComputedStyle(circle).fillOpacity)),
      );
    await expect.poll(async () => Math.max(...(await opacities()))).toBe(1);
    await expect
      .poll(async () => Math.min(...(await opacities())))
      .toBeCloseTo(VERY_LOW_DOT_OPACITY, 3);
  });

  test("at 600px the tabs lead the page and the stats card sits above the tab panel", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await mockRememberedPlayerSession(page, {
      ...REMEMBERED_PLAYER_RESPONSE,
      redirect: "/playerprofile",
    });
    await mockPlayerProfile(page);

    await page.goto("/playerprofile");

    const tabs = await page.getByRole("tablist", { name: "Profile sections" }).boundingBox();
    const card = await page.getByRole("region", { name: "Player stats" }).boundingBox();
    const panel = await page.getByRole("tabpanel").boundingBox();
    expect(tabs).not.toBeNull();
    expect(card).not.toBeNull();
    expect(panel).not.toBeNull();
    if (tabs === null || card === null || panel === null) {
      return;
    }
    expect(card.y).toBeGreaterThanOrEqual(tabs.y + tabs.height);
    expect(panel.y).toBeGreaterThanOrEqual(card.y + card.height);
    expect(Math.abs(panel.x - card.x)).toBeLessThan(1);
  });
});
