// @vitest-environment jsdom
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="qr-svg" data-value={value} />,
}));

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import QRCode from "./QRCode";

const INVITATION_LINK = "http://localhost:5173/invite/room";

describe("QRCode", () => {
  const originalClipboard = navigator.clipboard;

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
    // jsdom has no execCommand; drop the per-test stub
    Reflect.deleteProperty(document, "execCommand");
  });

  function getInvitationLinkField(): HTMLInputElement {
    return screen.getByRole<HTMLInputElement>("textbox", { name: "Invitation link" });
  }

  function mockClipboard(clipboard: Pick<Clipboard, "writeText"> | undefined): void {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: clipboard });
  }

  async function expectManualCopyFallback(): Promise<void> {
    const field = getInvitationLinkField();
    const guidance = "Copy failed. Select the link above and copy it manually.";

    await waitFor(() => {
      expect(document.activeElement).toBe(field);
    });
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe(INVITATION_LINK.length);
    expect(field.getAttribute("aria-describedby")).toBe(screen.getByText(guidance).id);
  }

  it("should render QR code and join heading when lobby is open", () => {
    render(<QRCode invitationLink={INVITATION_LINK} gameId={42} isLobbyFull={false} />);

    expect(screen.queryByText("Scan the QR code to join the game")).not.toBeNull();
    expect(screen.queryByText("/10 players joined")).toBeNull();
    expect(screen.queryByTestId("qr-svg")).not.toBeNull();
  });

  it("should show full state message when lobby is full", () => {
    render(<QRCode invitationLink={INVITATION_LINK} gameId={42} isLobbyFull />);

    expect(screen.queryByText("Room is full")).not.toBeNull();
    expect(screen.queryByText("New players cannot join right now.")).not.toBeNull();
    expect(screen.queryByTestId("qr-svg")).not.toBeNull();
    expect(screen.queryByText("10/10 players joined")).toBeNull();
  });

  it("should show the invitation link in a read-only field", () => {
    render(<QRCode invitationLink={INVITATION_LINK} gameId={42} isLobbyFull={false} />);

    const field = getInvitationLinkField();

    expect(field.value).toBe(INVITATION_LINK);
    expect(field.readOnly).toBe(true);
  });

  it("should select the whole invitation link when the field receives focus", () => {
    render(<QRCode invitationLink={INVITATION_LINK} gameId={42} isLobbyFull={false} />);

    const field = getInvitationLinkField();
    fireEvent.focus(field);

    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe(INVITATION_LINK.length);
  });

  it("should keep the invitation link visible when lobby is full", () => {
    render(<QRCode invitationLink={INVITATION_LINK} gameId={42} isLobbyFull />);

    expect(getInvitationLinkField()).not.toBeNull();
  });

  it("should copy invitation link to clipboard when copy button is clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard({ writeText });

    render(<QRCode invitationLink={INVITATION_LINK} gameId={42} isLobbyFull={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy Invite Link" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(INVITATION_LINK);
    });
  });

  it("should focus and select the invitation link when clipboard writeText is rejected", async () => {
    mockClipboard({ writeText: vi.fn().mockRejectedValue(new Error("Permission denied")) });

    render(<QRCode invitationLink={INVITATION_LINK} gameId={42} isLobbyFull={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy Invite Link" }));

    await expectManualCopyFallback();
  });

  it("should focus and select the invitation link when the copy command fails without clipboard API", async () => {
    mockClipboard(undefined);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });

    render(<QRCode invitationLink={INVITATION_LINK} gameId={42} isLobbyFull={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy Invite Link" }));

    await expectManualCopyFallback();
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });
});
