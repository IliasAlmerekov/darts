// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FinishedGamePlayerItemList from "./FinishedGamePlayerItemList";

function buildUserMapItem(overrides?: Partial<{ name: string }>): { name: string } {
  return {
    name: "Player",
    ...overrides,
  };
}

describe("FinishedGamePlayerItemList", () => {
  it("should render finished players when userMap contains items", () => {
    render(
      <FinishedGamePlayerItemList
        userMap={[
          buildUserMapItem({ name: "Alice" }),
          buildUserMapItem({ name: "Bob" }),
          buildUserMapItem({ name: "Charlie" }),
        ]}
      />,
    );

    expect(screen.queryByText("Finished Players")).not.toBeNull();
    expect(screen.queryByRole("list", { name: "Finished players list" })).not.toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("should not render when userMap is empty", () => {
    const { container } = render(<FinishedGamePlayerItemList userMap={[]} />);
    expect(container.childElementCount).toBe(0);
  });
});
