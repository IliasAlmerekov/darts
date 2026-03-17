// @vitest-environment jsdom

vi.mock("@/shared/api/game", () => ({
  getGameThrows: vi.fn(),
  getGameSettings: vi.fn(),
  startGame: vi.fn(),
}));

vi.mock("@/shared/api/room", () => ({
  createRoom: vi.fn(),
  getInvitation: vi.fn(),
  updatePlayerOrder: vi.fn(),
  leaveRoom: vi.fn(),
  addGuestPlayer: vi.fn(),
}));

import { fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getGameThrows, getGameSettings } from "@/shared/api/game";
import {
  createRoom,
  getInvitation,
  updatePlayerOrder,
  leaveRoom,
  addGuestPlayer,
} from "@/shared/api/room";
import StartPage from "./StartPage";
import {
  resetRoomStore,
  resetGameStore,
  resetPreCreateGameSettings,
  setLastFinishedGameSummary,
  setInvitation,
} from "@/shared/store";
import { buildBackendPlayer, buildGameThrowsResponse } from "@/shared/types/game.test-support";

// ---------------------------------------------------------------------------
// MockEventSource — browser API boundary stub
// ---------------------------------------------------------------------------

type EventHandler = (event: MessageEvent<string>) => void;

class MockEventSource {
  static last: MockEventSource | null = null;

  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;

  private handlers = new Map<string, EventHandler[]>();

  constructor(_url: string, _init?: EventSourceInit) {
    MockEventSource.last = this;
  }

  addEventListener(event: string, handler: EventHandler): void {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(event, [...existing, handler]);
  }

  removeEventListener(event: string, handler: EventHandler): void {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(
      event,
      existing.filter((h) => h !== handler),
    );
  }

  dispatch(event: string, data: string): void {
    const eventHandlers = this.handlers.get(event) ?? [];
    const messageEvent = new MessageEvent(event, { data });
    for (const handler of eventHandlers) {
      handler(messageEvent);
    }
  }

  close(): void {
    // noop
  }
}

// ---------------------------------------------------------------------------
// MockAudio — browser API boundary stub
// ---------------------------------------------------------------------------

class MockAudio {
  volume = 1;
  play = vi.fn().mockResolvedValue(undefined);
  constructor(_src?: string) {}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderStartPage(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/start/:id" element={<StartPage />} />
        <Route path="/start" element={<StartPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("StartPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockEventSource.last = null;
    sessionStorage.clear();
    resetRoomStore();
    resetGameStore();
    resetPreCreateGameSettings();
    setLastFinishedGameSummary(null);
    vi.stubGlobal("EventSource", MockEventSource);
    vi.stubGlobal("Audio", MockAudio);
    vi.mocked(getGameThrows).mockResolvedValue(buildGameThrowsResponse());
    vi.mocked(getInvitation).mockResolvedValue({ gameId: 0, invitationLink: "" });
    vi.mocked(updatePlayerOrder).mockResolvedValue(undefined);
    vi.mocked(leaveRoom).mockResolvedValue(undefined);
    vi.mocked(addGuestPlayer).mockResolvedValue({ id: 99, name: "Guest" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
    resetRoomStore();
    resetGameStore();
  });

  it("should disable guest button when 10/10 players have joined", async () => {
    setInvitation({ gameId: 1, invitationLink: "/invite/1" });
    vi.mocked(getGameThrows).mockResolvedValueOnce(
      buildGameThrowsResponse({
        id: 1,
        players: Array.from({ length: 10 }, (_, i) =>
          buildBackendPlayer({
            id: i + 1,
            name: `Player ${i + 1}`,
            isActive: i === 0,
            position: i,
          }),
        ),
      }),
    );

    renderStartPage("/start/1");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Play as a guest" }).getAttribute("disabled"),
      ).not.toBeNull();
    });
  });

  it("should render the guest button in the action row next to Start when the page loads", async () => {
    setInvitation({ gameId: 1, invitationLink: "/invite/1" });
    vi.mocked(getGameThrows).mockResolvedValueOnce(buildGameThrowsResponse({ id: 1 }));

    renderStartPage("/start/1");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Play as a guest" })).toBeTruthy();
    });

    const guestButton = screen.getByRole("button", { name: "Play as a guest" });
    expect(guestButton).toBeTruthy();

    expect(screen.queryByText("Play as a guest")).toBeNull();
    expect(screen.getByRole("img", { name: "Play as a guest" })).toBeTruthy();
    expect(guestButton.querySelector("svg")).toBeNull();
  });

  it("should render page-level error and allow dismissing it when room creation fails", async () => {
    vi.mocked(createRoom).mockRejectedValueOnce(new Error("server error"));

    renderStartPage("/start");

    const createGameButtons = screen.getAllByRole("button", { name: "Create Game" });
    const firstCreateButton = createGameButtons.at(0);
    expect(firstCreateButton).toBeTruthy();
    await act(async () => {
      if (firstCreateButton) {
        fireEvent.click(firstCreateButton);
      }
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });

  it("should show Created state for disabled create button when a game is already created", async () => {
    setInvitation({ gameId: 1, invitationLink: "/invite/1" });
    vi.mocked(getGameThrows).mockResolvedValueOnce(buildGameThrowsResponse({ id: 1 }));

    renderStartPage("/start/1");

    await waitFor(() => {
      const createdText = screen.getByText("Created");
      const createdButton = createdText.closest("button");
      expect(createdButton).toBeTruthy();
      expect(createdButton?.getAttribute("disabled")).toBe("");
    });
  });

  it("should render Create Game actions as icon buttons when the start page is visible", () => {
    renderStartPage("/start");

    const createButtons = screen.getAllByRole("button", { name: "Create Game" });
    expect(createButtons.length).toBe(2);

    for (const createButton of createButtons) {
      // The button should render and include an icon image.
      expect(createButton).toBeTruthy();
      expect(createButton.querySelector("img")).toBeTruthy();
    }
  });

  it("should resolve relative invitation links on the frontend origin when copying the invite link", async () => {
    setInvitation({ gameId: 42, invitationLink: "/api/invite/join/abc" });
    vi.mocked(getGameThrows).mockResolvedValueOnce(buildGameThrowsResponse({ id: 42 }));

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: writeTextMock },
    });

    renderStartPage("/start/42");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Copy Invite Link" })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy Invite Link" }));
    });

    expect(writeTextMock).toHaveBeenCalledWith("http://localhost:3000/api/invite/join/abc");
  });

  it("should preserve absolute invitation links from the backend when copying the invite link", async () => {
    setInvitation({
      gameId: 42,
      invitationLink: "https://darts-sigma.vercel.app/api/invite/join/abc",
    });
    vi.mocked(getGameThrows).mockResolvedValueOnce(buildGameThrowsResponse({ id: 42 }));

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: writeTextMock },
    });

    renderStartPage("/start/42");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Copy Invite Link" })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy Invite Link" }));
    });

    expect(writeTextMock).toHaveBeenCalledWith(
      "https://darts-sigma.vercel.app/api/invite/join/abc",
    );
  });

  it("should keep Start label while button is disabled during game start", async () => {
    setInvitation({ gameId: 1, invitationLink: "/invite/1" });
    vi.mocked(getGameThrows).mockResolvedValueOnce(
      buildGameThrowsResponse({
        id: 1,
        players: [
          buildBackendPlayer({ id: 1, name: "Player 1", isActive: true, position: 0 }),
          buildBackendPlayer({ id: 2, name: "Player 2", isActive: false, position: 1 }),
        ],
      }),
    );
    // getGameSettings never resolves — keeps component in "starting" state
    vi.mocked(getGameSettings).mockReturnValue(new Promise(() => undefined));

    renderStartPage("/start/1");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
    });

    // Wait for players to load (so start is enabled)
    await waitFor(() => {
      const startBtn = screen.getByRole("button", { name: "Start" });
      expect(startBtn.getAttribute("disabled")).toBeNull();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start" }));
    });

    const startButton = screen.getByRole("button", { name: "Start" });
    expect(startButton).toHaveProperty("disabled", true);
  });

  it("should pass live player data from useStartPage into LivePlayersList when players load", async () => {
    setInvitation({ gameId: 1, invitationLink: "/invite/1" });
    vi.mocked(getGameThrows).mockResolvedValueOnce(
      buildGameThrowsResponse({
        id: 1,
        players: [buildBackendPlayer({ id: 7, name: "Alex", isActive: true, position: 0 })],
      }),
    );

    renderStartPage("/start/1");

    await waitFor(() => {
      expect(screen.getByText("Alex")).toBeTruthy();
    });
  });
});
