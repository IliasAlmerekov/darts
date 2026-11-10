import type { Page, Request } from "@playwright/test";
import { test, expect } from "../shared/test";
import { addGuestPlayer, createGame, loginAsAdmin } from "../shared/start-page-helpers";
import { mockLobbyApi } from "../shared/lobby-route-mocks";

const FIRST_GUEST = "Anna";
const SECOND_GUEST = "Ben";

async function openLobbyWithTwoGuests(page: Page): Promise<void> {
  await mockLobbyApi(page);
  await loginAsAdmin(page);
  await createGame(page);
  await addGuestPlayer(page, FIRST_GUEST);
  await addGuestPlayer(page, SECOND_GUEST);
}

function waitForPositionsRequest(page: Page): Promise<Request> {
  return page.waitForRequest(
    (request) => request.method() === "POST" && /\/api\/room\/\d+\/positions$/.test(request.url()),
  );
}

function playerIdsByPosition(request: Request): number[] {
  const body: unknown = request.postDataJSON();
  if (typeof body !== "object" || body === null || !("positions" in body)) {
    throw new Error("The positions request has no positions");
  }
  const { positions } = body;
  if (!Array.isArray(positions)) {
    throw new Error("The positions request has no positions list");
  }
  const seats = positions.map((seat: unknown) => {
    if (
      typeof seat !== "object" ||
      seat === null ||
      !("playerId" in seat) ||
      !("position" in seat) ||
      typeof seat.playerId !== "number" ||
      typeof seat.position !== "number"
    ) {
      throw new Error("A positions entry has no numeric playerId and position");
    }
    return { playerId: seat.playerId, position: seat.position };
  });
  return seats.sort((a, b) => a.position - b.position).map((seat) => seat.playerId);
}

async function expectSecondGuestAboveFirst(page: Page): Promise<void> {
  await expect(async () => {
    const first = await page.getByText(FIRST_GUEST, { exact: true }).boundingBox();
    const second = await page.getByText(SECOND_GUEST, { exact: true }).boundingBox();
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second?.y ?? 0).toBeLessThan(first?.y ?? 0);
  }).toPass();
}

test.describe("Reorder selected players", () => {
  test("moves a player down by dragging the move handle with a mouse", async ({ page }) => {
    await openLobbyWithTwoGuests(page);
    const handles = page.getByRole("button", { name: "Move player" });
    const firstHandle = await handles.nth(0).boundingBox();
    const secondHandle = await handles.nth(1).boundingBox();
    if (firstHandle === null || secondHandle === null) {
      throw new Error("The move handles are not visible");
    }
    const positionsRequest = waitForPositionsRequest(page);

    await page.mouse.move(
      firstHandle.x + firstHandle.width / 2,
      firstHandle.y + firstHandle.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      secondHandle.x + secondHandle.width / 2,
      secondHandle.y + secondHandle.height,
      { steps: 10 },
    );
    await page.mouse.up();

    expect(playerIdsByPosition(await positionsRequest)).toEqual([1002, 1001]);
    await expectSecondGuestAboveFirst(page);
  });

  test("moves a player down with Space, Arrow Down and Space", async ({ page }) => {
    await openLobbyWithTwoGuests(page);
    const positionsRequest = waitForPositionsRequest(page);

    const firstHandle = page.getByRole("button", { name: "Move player" }).first();
    await firstHandle.focus();
    // dnd-kit binds its key listener a tick after the pick-up, so each key waits for the
    // state the key before produced.
    await page.keyboard.press("Space");
    await expect(firstHandle).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByRole("status").filter({ hasText: "moved over droppable area 1002" }),
    ).toBeAttached();
    await page.keyboard.press("Space");

    expect(playerIdsByPosition(await positionsRequest)).toEqual([1002, 1001]);
    await expectSecondGuestAboveFirst(page);
  });
});
