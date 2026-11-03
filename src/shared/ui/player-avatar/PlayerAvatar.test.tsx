// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlayerAvatar } from "./PlayerAvatar";

// Vite inlines small SVGs as data URLs; the file name keeps the assertions readable.
vi.mock("@/assets/icons/user-blue.svg", () => ({ default: "user-blue.svg" }));

function avatarSource(): string | null {
  return screen.getByRole("presentation").getAttribute("src");
}

describe("PlayerAvatar", () => {
  it("loads the next player's avatar after the previous one failed", () => {
    const { rerender } = render(<PlayerAvatar playerId={1} />);
    fireEvent.error(screen.getByRole("presentation"));
    expect(avatarSource()).toBe("user-blue.svg");

    rerender(<PlayerAvatar playerId={2} />);

    expect(avatarSource()).toBe("/api/player/2/avatar");
  });

  it("shows the fallback icon without a request when there is no player id", () => {
    render(<PlayerAvatar playerId={null} />);

    expect(avatarSource()).toBe("user-blue.svg");
  });
});
