// @vitest-environment jsdom
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="qr-svg" data-value={value} />,
}));

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import QRCode from "./QRCode";

describe("QRCode", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render QR code and join heading when lobby is open", () => {
    render(
      <QRCode invitationLink="http://localhost:5173/invite/room" gameId={42} isLobbyFull={false} />,
    );

    expect(screen.queryByText("Scan the QR code to join the game")).not.toBeNull();
    expect(screen.queryByText("/10 players joined")).toBeNull();
    expect(screen.queryByTestId("qr-svg")).not.toBeNull();
  });

  it("should show full state message when lobby is full", () => {
    render(<QRCode invitationLink="http://localhost:5173/invite/room" gameId={42} isLobbyFull />);

    expect(screen.queryByText("Room is full")).not.toBeNull();
    expect(screen.queryByText("New players cannot join right now.")).not.toBeNull();
    expect(screen.queryByTestId("qr-svg")).not.toBeNull();
    expect(screen.queryByText("10/10 players joined")).toBeNull();
  });

  it("should copy invitation link to clipboard when copy button is clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(
      <QRCode invitationLink="http://localhost:5173/invite/room" gameId={42} isLobbyFull={false} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy Invite Link" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("http://localhost:5173/invite/room");
    });
  });
});
