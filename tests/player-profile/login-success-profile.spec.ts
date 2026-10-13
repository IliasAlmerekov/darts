import { test, expect } from "../shared/test";
import {
  MOCK_LOGIN_CREDENTIALS,
  mockProfileLoginSuccessFlow,
  PROFILE_LOGIN_SUCCESS_RESPONSE,
} from "../shared/auth-route-mocks";

test.describe("Player profile login success", () => {
  test("ordinary player login reaches the player profile and renders profile data", async ({
    page,
  }) => {
    const { email: testEmail, password: testPassword } = MOCK_LOGIN_CREDENTIALS;
    const { profile } = PROFILE_LOGIN_SUCCESS_RESPONSE;

    await mockProfileLoginSuccessFlow(page);

    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    await page.getByRole("textbox", { name: "Email *" }).fill(testEmail);
    await page.getByRole("textbox", { name: "Password *" }).fill(testPassword);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/playerprofile");
    await expect(page.getByRole("heading", { name: "Spielerprofil" })).toBeVisible();
    await expect(page.getByText(`Benutzername: ${profile.nickname}`)).toBeVisible();
    await expect(page.getByText(`Spiele gespielt: ${profile.stats.gamesPlayed}`)).toBeVisible();
    await expect(
      page.getByText(`Durchschnittspunktzahl: ${profile.stats.scoreAverage}`),
    ).toBeVisible();
  });
});
