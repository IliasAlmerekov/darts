// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import StartPage from "./StartPage";
import styles from "./StartPage.module.css";

vi.mock("../hooks/useStartPage", () => ({
  useStartPage: () => ({
    invitation: { invitationLink: "/invite/abc", gameId: 1 },
    gameId: 1,
    lastFinishedGameId: null,
    playerCount: 2,
    playerOrder: [],
    creating: false,
    isGuestOverlayOpen: false,
    guestUsername: "",
    guestError: null,
    guestSuggestions: [],
    isAddingGuest: false,
    handleDragEnd: vi.fn(),
    handleRemovePlayer: vi.fn(),
    handleStartGame: vi.fn(),
    handleCreateRoom: vi.fn(),
    openGuestOverlay: vi.fn(),
    closeGuestOverlay: vi.fn(),
    setGuestUsername: vi.fn(),
    handleGuestSuggestion: vi.fn(),
    handleAddGuest: vi.fn(),
  }),
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
});
