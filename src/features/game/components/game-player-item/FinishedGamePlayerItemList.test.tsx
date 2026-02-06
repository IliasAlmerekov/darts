// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FinishedGamePlayerItemList from "./FinishedGamePlayerItemList";

describe("FinishedGamePlayerItemList", () => {
  it("renders finished players inside a scrollable list container", () => {
    render(
      <FinishedGamePlayerItemList
        userMap={[
          { name: "Alice" },
          { name: "Bob" },
          { name: "Charlie" },
        ]}
      />,
    );

    expect(screen.queryByText("Finished Players")).not.toBeNull();
    expect(screen.queryByRole("list", { name: "Finished players list" })).not.toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("does not render when there are no finished players", () => {
    const { container } = render(<FinishedGamePlayerItemList userMap={[]} />);
    expect(container.childElementCount).toBe(0);
  });
});
