// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/api/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/shared/api/player", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/player")>()),
  getPlayerPublicProfile: vi.fn(),
}));

vi.mock("@/shared/services/browser/clientLogger", () => ({
  clientLogger: { error: vi.fn() },
}));

// Vite inlines small SVGs as data URLs; file names keep the icon assertions readable.
vi.mock("@/assets/icons/user-blue.svg", () => ({ default: "user-blue.svg" }));

import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { ApiError } from "@/shared/api";
import { getAuthenticatedUser, type AuthenticatedUser } from "@/shared/api/auth";
import { getPlayerPublicProfile } from "@/shared/api/player";
import { ROUTES } from "@/lib/router/routes";
import { queryClient } from "@/shared/query/queryClient";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import {
  buildPlayerProfileStats,
  buildPlayerPublicProfile,
} from "@/shared/types/player.test-support";
import PublicProfilePage from ".";
import { publicProfileLoader } from "./publicProfileLoader";

type Router = ReturnType<typeof createMemoryRouter>;

function createUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    success: true,
    id: 42,
    roles: ["ROLE_PLAYER"],
    email: "alice@example.com",
    username: "Alice",
    redirect: ROUTES.playerProfile,
    ...overrides,
  };
}

function renderPage(playerId = 7): Router {
  const router = createMemoryRouter(
    [
      { path: ROUTES.playerProfile, element: <p>Own Player profile</p> },
      {
        path: ROUTES.publicProfilePattern,
        loader: publicProfileLoader,
        element: <PublicProfilePage />,
      },
    ],
    { initialEntries: [ROUTES.publicProfile(playerId)] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

function statValue(name: string): HTMLElement {
  return screen.getByRole("group", { name });
}

function block(name: string): HTMLElement {
  return screen.getByRole("region", { name });
}

/** The decorative images before the name in the card: the avatar or its fallback icon. */
function avatarImages(): HTMLElement[] {
  const card = screen.getByRole("region", { name: "Player stats" });
  const name = within(card).getByRole("heading", { level: 2 });
  return within(card)
    .getAllByRole("presentation")
    .filter((image) => image.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("PublicProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    vi.mocked(getAuthenticatedUser).mockResolvedValue(createUser());
    vi.mocked(getPlayerPublicProfile).mockResolvedValue(buildPlayerPublicProfile());
    // jsdom lacks DOMMatrixReadOnly; the sector card's positioner reads a translate from it.
    vi.stubGlobal(
      "DOMMatrixReadOnly",
      class {
        m41 = 0;
        m42 = 0;
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the other player's name, avatar and Profile statistics", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { level: 2, name: "Anna" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Anna's profile" })).toBeTruthy();
    expect(avatarImages().map((image) => image.getAttribute("src"))).toEqual([
      "/api/player/7/avatar",
    ]);
    expect(within(statValue("Games played")).getByText("18")).toBeTruthy();
    expect(statValue("Won").textContent).toBe("Won739% win rate");
    expect(within(statValue("three-dart average")).getByText("56.40")).toBeTruthy();
    expect(statValue("Checkout rate").textContent).toBe("Checkout rate32%7 / 22 checkouts");
    expect(block("Hit distribution").textContent).toContain(
      "See where Anna hits the dartboard most often.",
    );
    expect(block("Favorite doubles").textContent).toContain("D16");
    expect(block("Highest finish").textContent).toContain("121");
    expect(block("Most hit segment").textContent).toContain(
      "Anna hits segment 20 more than any other segment.",
    );
  });

  it("shows no recent games, registration date, edit control or tabs", async () => {
    renderPage();
    await screen.findByRole("heading", { level: 2, name: "Anna" });

    expect(screen.queryByRole("list", { name: "Recent games" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Scoring trend" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Member since" })).toBeNull();
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /log out|edit/i })).toBeNull();
    expect(screen.getByRole("link", { name: "Back to my profile" }).getAttribute("href")).toBe(
      ROUTES.playerProfile,
    );
  });

  it("shows empty statistics, not an error, for a player without games", async () => {
    vi.mocked(getPlayerPublicProfile).mockResolvedValue(
      buildPlayerPublicProfile({
        stats: buildPlayerProfileStats({
          gamesPlayed: 0,
          scoreAverage: null,
          wins: 0,
          winRate: null,
          checkoutRate: null,
          checkoutHits: 0,
          checkoutAttempts: 0,
          hitDistribution: buildPlayerProfileStats().hitDistribution.map(({ field }) => ({
            field,
            hits: 0,
          })),
          mostHitSegment: null,
          favoriteDoubles: [],
          highestFinish: null,
        }),
      }),
    );

    renderPage();

    const gamesPlayed = await screen.findByRole("group", { name: "Games played" });
    expect(within(gamesPlayed).getByText("0")).toBeTruthy();
    expect(within(statValue("three-dart average")).getByText("–")).toBeTruthy();
    expect(block("Favorite doubles").textContent).toBe(
      "Favorite doublesNo double-out checkouts yet",
    );
    expect(block("Highest finish").textContent).toBe("Highest finishNo finish yet");
    expect(block("Most hit segment").textContent).toBe("Most hit segmentNo hits yet");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("redirects the player's own id to their own Player profile", async () => {
    const router = renderPage(42);

    expect(await screen.findByText("Own Player profile")).toBeTruthy();
    expect(router.state.location.pathname).toBe(ROUTES.playerProfile);
    expect(getPlayerPublicProfile).not.toHaveBeenCalled();
  });

  it("shows a not-found state when the player has no Public profile", async () => {
    vi.mocked(getPlayerPublicProfile).mockRejectedValue(
      new ApiError("Player not found", { status: 404, data: { error: "PLAYER_NOT_FOUND" } }),
    );

    renderPage(8);

    const notFound = await screen.findByRole("alert");
    expect(within(notFound).getByRole("heading", { name: "Player not found" })).toBeTruthy();
    expect(
      within(notFound).getByRole("link", { name: "Back to my profile" }).getAttribute("href"),
    ).toBe(ROUTES.playerProfile);
    expect(within(notFound).queryByRole("button", { name: "Retry" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Player stats" })).toBeNull();
    expect(clientLogger.error).not.toHaveBeenCalled();
  });

  it("shows an error with Retry for any other failure, and Retry asks again", async () => {
    vi.mocked(getPlayerPublicProfile).mockRejectedValue(new ApiError("boom", { status: 500 }));

    renderPage();

    const error = await screen.findByRole("alert");
    expect(
      within(error).getByRole("heading", { name: "Could not load this profile" }),
    ).toBeTruthy();

    vi.mocked(getPlayerPublicProfile).mockResolvedValue(buildPlayerPublicProfile());
    fireEvent.click(within(error).getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Anna" })).toBeTruthy();
  });

  it("shows the user icon in the circle when the avatar fails to load", async () => {
    renderPage();
    await screen.findByRole("heading", { level: 2, name: "Anna" });
    const [avatar] = avatarImages();
    if (avatar === undefined) throw new Error("avatar image missing");

    fireEvent.error(avatar);

    expect(avatarImages().map((image) => image.getAttribute("src"))).toEqual(["user-blue.svg"]);
  });
});
