import { test, expect, type Page } from "@playwright/test";

const viewports = [
  { name: "phone-360", width: 360, height: 800 },
  { name: "tablet-portrait", width: 768, height: 1024 },
  { name: "tablet-landscape", width: 1024, height: 768 },
];

const mockAuth = async (page: Page): Promise<void> => {
  await page.route("**/api/login/success", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        roles: ["ROLE_ADMIN", "ROLE_PLAYER"],
        id: 1,
        username: "testuser",
        redirect: "/start",
      }),
    });
  });
};

type MockPlayer = {
  id: number;
  name: string;
  score: number;
  isActive: boolean;
  isBust: boolean;
  position: number;
  throwsInCurrentRound: number;
  currentRoundThrows: unknown[];
  roundHistory: unknown[];
};

const createMockPlayers = (count: number): MockPlayer[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Player ${index + 1}`,
    score: 301 - index * 5,
    isActive: index === 0,
    isBust: false,
    position: index + 1,
    throwsInCurrentRound: 0,
    currentRoundThrows: [],
    roundHistory: [],
  }));
};

const mockGame = async (
  page: Page,
  gameId = 1,
  status: "started" | "lobby" = "started",
  players: MockPlayer[] = createMockPlayers(2),
): Promise<void> => {
  await page.route(`**/api/game/${gameId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: gameId,
        status,
        currentRound: 1,
        activePlayerId: 1,
        currentThrowCount: 0,
        players,
        winnerId: null,
        settings: {
          startScore: 301,
          doubleOut: false,
          tripleOut: false,
        },
      }),
    });
  });
};

const mockInvitation = async (page: Page, gameId = 1): Promise<void> => {
  await page.route(`**/api/invite/create/${gameId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        gameId,
        invitationLink: `/invite/${gameId}`,
      }),
    });
  });
};

test.describe("Responsive admin layouts", () => {
  test("Start page adapts without overflow", async ({ page }) => {
    await mockAuth(page);

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/start");
      await page.waitForLoadState("domcontentloaded");

      const visibleCreateButton = page.locator("button:visible", { hasText: /create game/i });
      await expect(visibleCreateButton).toHaveCount(1);

      const hasHorizontalScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      await expect(hasHorizontalScroll, `${viewport.name} should not overflow`).toBe(false);
    }
  });

  test("Start page stacks panels and hides nav labels on mobile", async ({ page }) => {
    await mockAuth(page);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/start");
    await page.waitForLoadState("domcontentloaded");

    const navLabels = page.locator('[class*="tabLabel"]');
    await expect(navLabels.first()).toBeHidden();

    const leftPanel = page.locator('[class*="existingPlayerList"]');
    const rightPanel = page.locator('[class*="addedPlayerList"]');

    const leftBox = await leftPanel.boundingBox();
    const rightBox = await rightPanel.boundingBox();

    expect(leftBox).not.toBeNull();
    expect(rightBox).not.toBeNull();

    if (leftBox && rightBox) {
      expect(leftBox.y).toBeLessThan(rightBox.y);
    }
  });

  test("Start page shows create button centered when no QR on mobile", async ({ page }) => {
    await mockAuth(page);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/start");
    await page.waitForLoadState("domcontentloaded");

    const qrSection = page.locator('[class*="qrCodeSection"]').first();
    await expect(qrSection.getByText(/create game/i)).toBeVisible();
  });

  test("Start page keeps Create Game and Start actions near the bottom when lobby is empty", async ({
    page,
  }) => {
    await mockAuth(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/start");
    await page.waitForLoadState("domcontentloaded");

    const createGameButton = page.locator("button:visible", { hasText: /^create game$/i });
    const startButton = page.getByRole("button", { name: "Start" });
    const createBottomContainer = page
      .locator('[class*="existingPlayerList"] [class*="bottom"]')
      .first();
    const startBottomContainer = page.locator('[class*="startBtn"]').first();

    await expect(createGameButton).toHaveCount(1);
    await expect(startButton).toBeVisible();
    await expect(createBottomContainer).toBeVisible();
    await expect(startBottomContainer).toBeVisible();

    const [createBottomBox, startBottomBox] = await Promise.all([
      createBottomContainer.boundingBox(),
      startBottomContainer.boundingBox(),
    ]);

    expect(createBottomBox).not.toBeNull();
    expect(startBottomBox).not.toBeNull();

    if (createBottomBox && startBottomBox) {
      const createDistanceToViewportBottom = 768 - (createBottomBox.y + createBottomBox.height);
      const startDistanceToViewportBottom = 768 - (startBottomBox.y + startBottomBox.height);

      expect(createDistanceToViewportBottom).toBeGreaterThanOrEqual(0);
      expect(startDistanceToViewportBottom).toBeGreaterThanOrEqual(0);
      expect(createDistanceToViewportBottom).toBeLessThanOrEqual(48);
      expect(startDistanceToViewportBottom).toBeLessThanOrEqual(48);
    }
  });

  test("Start page hides create button on mobile when QR exists", async ({ page }) => {
    await mockAuth(page);
    await mockGame(page, 1, "lobby");
    await mockInvitation(page, 1);
    await page.addInitScript(() => {
      sessionStorage.setItem("darts_current_game_id", "1");
    });

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/start/1");
    await page.waitForLoadState("domcontentloaded");

    const qrSvg = page.locator('[class*="qrCodeWrapper"] svg').first();
    await expect(qrSvg).toBeVisible();

    const mobileCreateButton = page.locator('[class*="mobileCreateButtonWrapper"] button');
    await expect(mobileCreateButton).toHaveCount(0);
  });

  test("Start page centers QR heading text", async ({ page }) => {
    await mockAuth(page);
    await mockGame(page, 1, "lobby");
    await mockInvitation(page, 1);
    await page.addInitScript(() => {
      sessionStorage.setItem("darts_current_game_id", "1");
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/start/1");
    await page.waitForLoadState("domcontentloaded");

    const heading = page.getByRole("heading", { name: /scan the qr code/i });
    await expect(heading).toBeVisible();
    await expect
      .poll(() => heading.evaluate((el) => getComputedStyle(el).textAlign))
      .toBe("center");

    await page.setViewportSize({ width: 360, height: 800 });
    await expect
      .poll(() => heading.evaluate((el) => getComputedStyle(el).textAlign))
      .toBe("center");
  });

  test("Start page enlarges QR code and hides invite link on mobile", async ({ page }) => {
    await mockAuth(page);
    await mockGame(page, 1, "lobby");
    await mockInvitation(page, 1);
    await page.addInitScript(() => {
      sessionStorage.setItem("darts_current_game_id", "1");
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/start/1");
    await page.waitForLoadState("domcontentloaded");

    const qrSvg = page.locator('[class*="qrCodeWrapper"] svg').first();
    const inviteLink = page.locator('[class*="invitationLinkBox"]').first();

    await expect(qrSvg).toBeVisible();
    await expect(inviteLink).toBeVisible();

    await expect
      .poll(() => qrSvg.evaluate((el) => Math.round(el.getBoundingClientRect().width)))
      .toBeGreaterThan(150);
    const desktopQrWidth = await qrSvg.evaluate((el) =>
      Math.round(el.getBoundingClientRect().width),
    );

    await page.setViewportSize({ width: 360, height: 800 });

    const mobileQrWidth = await qrSvg.evaluate((el) =>
      Math.round(el.getBoundingClientRect().width),
    );
    expect(mobileQrWidth).toBeGreaterThanOrEqual(150);
    expect(mobileQrWidth).toBeLessThan(desktopQrWidth);
    await expect(inviteLink).toBeHidden();
  });

  test("Mobile start and guest buttons sit together with 90/10 split", async ({ page }) => {
    await mockAuth(page);
    await mockGame(page, 1, "lobby");
    await mockInvitation(page, 1);
    await page.addInitScript(() => {
      sessionStorage.setItem("darts_current_game_id", "1");
    });

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/start/1");
    await page.waitForLoadState("domcontentloaded");

    const startButton = page.getByRole("button", { name: "Start" });
    const guestButton = page.getByRole("button", { name: "Play as a guest" });

    await expect(startButton).toBeVisible();
    await expect(guestButton).toBeVisible();

    const startBox = await startButton.boundingBox();
    const guestBox = await guestButton.boundingBox();

    expect(startBox).not.toBeNull();
    expect(guestBox).not.toBeNull();

    if (startBox && guestBox) {
      const totalWidth = startBox.width + guestBox.width;
      const startRatio = startBox.width / totalWidth;
      const gap = Math.round(guestBox.x - (startBox.x + startBox.width));

      expect(startBox.x).toBeLessThan(guestBox.x);
      expect(startRatio).toBeGreaterThan(0.85);
      expect(startRatio).toBeLessThan(0.95);
      expect(gap).toBe(5);
      expect(Math.round(startBox.height)).toBe(Math.round(guestBox.height));
    }
  });

  test("Guest overlay keeps side padding on mobile", async ({ page }) => {
    await mockAuth(page);
    await mockGame(page, 1, "lobby");
    await mockInvitation(page, 1);
    await page.addInitScript(() => {
      sessionStorage.setItem("darts_current_game_id", "1");
    });

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/start/1");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: "Play as a guest" }).click();

    const overlayBox = page.locator('[class*="guestOverlayBox"]').first();
    await expect(overlayBox).toBeVisible();

    const box = await overlayBox.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      const rightMargin = 360 - (box.x + box.width);
      expect(box.x).toBeGreaterThan(7);
      expect(rightMargin).toBeGreaterThan(7);
    }
  });

  test("Mobile players list scrolls without pushing action buttons", async ({ page }) => {
    await mockAuth(page);
    await mockGame(page, 1, "lobby", createMockPlayers(9));
    await mockInvitation(page, 1);
    await page.addInitScript(() => {
      sessionStorage.setItem("darts_current_game_id", "1");
    });

    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto("/start/1");
    await page.waitForLoadState("domcontentloaded");

    const listScroll = page.locator('[class*="selectedPlayerListScroll"]').first();
    const startButton = page.getByRole("button", { name: "Start" });
    const startContainer = page.locator('[class*="startBtn"]').first();

    await expect(startButton).toBeVisible();
    await expect(startContainer).toBeVisible();
    const startBoxBefore = await startButton.boundingBox();
    const listHasOverflow = await listScroll.evaluate((el) => {
      return (el as HTMLElement).scrollHeight > (el as HTMLElement).clientHeight;
    });

    if (listHasOverflow) {
      await listScroll.evaluate((el) => {
        (el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight;
      });

      await expect
        .poll(() => listScroll.evaluate((el) => (el as HTMLElement).scrollTop))
        .toBeGreaterThan(0);
    }

    const startBoxAfter = await startButton.boundingBox();
    const startContainerMargin = await startContainer.evaluate((el) => {
      return getComputedStyle(el).marginBottom;
    });

    expect(startBoxBefore).not.toBeNull();
    expect(startBoxAfter).not.toBeNull();

    if (startBoxBefore && startBoxAfter) {
      expect(Math.round(startBoxBefore.y)).toBe(Math.round(startBoxAfter.y));
    }
    expect(startContainerMargin).toBe("20px");
  });

  test("Start button stays visible at the bottom on short screens", async ({ page }) => {
    await mockAuth(page);
    await mockGame(page, 1, "lobby", createMockPlayers(10));
    await mockInvitation(page, 1);
    await page.addInitScript(() => {
      sessionStorage.setItem("darts_current_game_id", "1");
    });

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/start/1");
    await page.waitForLoadState("domcontentloaded");

    const startButton = page.getByRole("button", { name: "Start" });
    await expect(startButton).toBeVisible();

    const startBox = await startButton.boundingBox();
    expect(startBox).not.toBeNull();

    if (startBox) {
      const startBottom = startBox.y + startBox.height;

      if (startBottom > 768) {
        await startButton.scrollIntoViewIfNeeded();
      }

      await expect(startButton).toBeInViewport();

      const distanceToViewportBottom = await startButton.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return window.innerHeight - rect.bottom;
      });

      expect(distanceToViewportBottom).toBeGreaterThanOrEqual(0);
      expect(distanceToViewportBottom).toBeLessThanOrEqual(64);
    }
  });

  test("Mobile navigation keeps deepblue icon left and shrinks icons", async ({ page }) => {
    await mockAuth(page);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/start");
    await page.waitForLoadState("domcontentloaded");

    const navigation = page.locator('[class*="navigation"]').first();
    const deepblueIcon = navigation.locator('[class*="deepblueIcon"]');
    const navIcons = navigation.locator('[class*="tabContent"] img');

    await expect(deepblueIcon).toBeVisible();
    await expect(navIcons.first()).toBeVisible();

    const navBox = await navigation.boundingBox();
    const deepblueBox = await deepblueIcon.boundingBox();
    const firstIconBox = await navIcons.first().boundingBox();

    expect(navBox).not.toBeNull();
    expect(deepblueBox).not.toBeNull();
    expect(firstIconBox).not.toBeNull();

    if (navBox && deepblueBox && firstIconBox) {
      expect(deepblueBox.x).toBeGreaterThanOrEqual(navBox.x);
      expect(deepblueBox.x).toBeLessThan(firstIconBox.x);
    }

    await expect
      .poll(() => navIcons.first().evaluate((el) => (el as HTMLImageElement).width))
      .toBeLessThanOrEqual(18);
  });

  test("Game page adapts without overflow", async ({ page }) => {
    await mockAuth(page);
    await mockGame(page, 1);

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/game/1");
      await page.waitForLoadState("domcontentloaded");

      await expect(page.locator('img[alt="Back to Home"]')).toBeVisible();
      await expect(page.locator('img[alt="Undo"]')).toBeVisible();

      const hasHorizontalScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      await expect(hasHorizontalScroll, `${viewport.name} should not overflow`).toBe(false);
    }
  });

  test("Game page desktop aligns throws, shifts score, and keeps undo compact on the right", async ({
    page,
  }) => {
    await mockAuth(page);
    await mockGame(page, 1);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/game/1");
    await page.waitForLoadState("domcontentloaded");

    const keyboardAndUndo = page.locator('[class*="keyboardAndUndo"]').first();
    const undoButton = page.locator('img[alt="Undo"]').locator("xpath=ancestor::button[1]");
    const throwDisplay = page.locator('[class*="throwDisplay"]').first();
    const scorePointer = page.locator('[class*="pointer"]').first();

    await expect(keyboardAndUndo).toBeVisible();
    await expect(undoButton).toBeVisible();
    await expect(throwDisplay).toBeVisible();
    await expect(scorePointer).toBeVisible();

    await expect
      .poll(() => throwDisplay.evaluate((el) => getComputedStyle(el).flexWrap))
      .toBe("nowrap");
    await expect
      .poll(() => scorePointer.evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft)))
      .toBeGreaterThan(0);

    const [containerBox, undoBox] = await Promise.all([
      keyboardAndUndo.boundingBox(),
      undoButton.boundingBox(),
    ]);

    expect(containerBox).not.toBeNull();
    expect(undoBox).not.toBeNull();

    if (containerBox && undoBox) {
      expect(undoBox.width).toBeLessThan(containerBox.width * 0.25);
      expect(undoBox.x + undoBox.width / 2).toBeGreaterThan(
        containerBox.x + containerBox.width / 2,
      );
    }
  });
});
