// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import StartPage from "./StartPage";
import styles from "./StartPage.module.css";

type StartPageHookResult = {
  invitation: { invitationLink: string; gameId: number } | null;
  gameId: number | null;
  lastFinishedGameId: number | null;
  playerCount: number;
  isLobbyFull: boolean;
  playerOrder: number[];
  creating: boolean;
  starting: boolean;
  pageError: string | null;
  isGuestOverlayOpen: boolean;
  guestUsername: string;
  guestError: string | null;
  guestSuggestions: string[];
  isAddingGuest: boolean;
  handleDragEnd: () => void;
  handleRemovePlayer: () => void;
  handleStartGame: () => void;
  handleCreateRoom: () => void;
  clearPageError: () => void;
  openGuestOverlay: () => void;
  closeGuestOverlay: () => void;
  setGuestUsername: () => void;
  handleGuestSuggestion: () => void;
  handleAddGuest: () => void;
};

const buildHookResult = (overrides: Partial<StartPageHookResult> = {}): StartPageHookResult => ({
  invitation: { invitationLink: "/invite/abc", gameId: 1 },
  gameId: 1,
  lastFinishedGameId: null,
  playerCount: 2,
  isLobbyFull: false,
  playerOrder: [],
  creating: false,
  starting: false,
  pageError: null,
  isGuestOverlayOpen: false,
  guestUsername: "",
  guestError: null,
  guestSuggestions: [],
  isAddingGuest: false,
  handleDragEnd: vi.fn(),
  handleRemovePlayer: vi.fn(),
  handleStartGame: vi.fn(),
  handleCreateRoom: vi.fn(),
  clearPageError: vi.fn(),
  openGuestOverlay: vi.fn(),
  closeGuestOverlay: vi.fn(),
  setGuestUsername: vi.fn(),
  handleGuestSuggestion: vi.fn(),
  handleAddGuest: vi.fn(),
  ...overrides,
});

const useStartPageMock = vi.fn((): StartPageHookResult => buildHookResult());

vi.mock("../hooks/useStartPage", () => ({
  useStartPage: () => useStartPageMock(),
}));

vi.mock("../components/live-players-list/LivePlayersList", () => ({
  LivePlayersList: () => <div data-testid="live-players-list" />,
}));

vi.mock("@/components/navigation-bar/NavigationBar", () => ({
  default: () => <div data-testid="navigation-bar" />,
}));

vi.mock("../components/qr-code/QRCode", () => ({
  default: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

describe("StartPage", () => {
  it("disables guest button when 10/10 players joined", () => {
    useStartPageMock.mockReturnValueOnce(
      buildHookResult({
        playerCount: 10,
        isLobbyFull: true,
      }),
    );

    render(
      <MemoryRouter>
        <StartPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("button", { name: "Play as a guest" }).getAttribute("disabled"),
    ).not.toBeNull();
  });

  it("renders the guest button in the action row next to Start", () => {
    render(
      <MemoryRouter>
        <StartPage />
      </MemoryRouter>,
    );

    const guestButton = screen.getByRole("button", { name: "Play as a guest" });
    expect(guestButton.classList.contains(styles.guestButtonMobile)).toBe(true);

    const actionRow = guestButton.closest(`.${styles.mobileActionRow}`);
    expect(actionRow).not.toBeNull();

    expect(screen.queryByText("Play as a guest")).toBeNull();
  });

  it("renders page-level error and dismisses it", () => {
    const clearPageError = vi.fn();
    useStartPageMock.mockReturnValueOnce(
      buildHookResult({
        pageError: "Could not create a new game. Please try again.",
        clearPageError,
      }),
    );

    render(
      <MemoryRouter>
        <StartPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    screen.getByRole("button", { name: "Dismiss" }).click();
    expect(clearPageError).toHaveBeenCalledTimes(1);
  });
});
