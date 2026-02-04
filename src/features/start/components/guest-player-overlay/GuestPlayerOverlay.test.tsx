// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GuestPlayerOverlay from "./GuestPlayerOverlay";

describe("GuestPlayerOverlay", () => {
  it("prevents adding when username is empty", () => {
    const onAdd = vi.fn();
    render(
      <GuestPlayerOverlay
        isOpen
        username=""
        onUsernameChange={() => {}}
        onAdd={onAdd}
        onClose={() => {}}
      />,
    );

    const button = screen.getByRole("button", { name: "Add" });
    fireEvent.click(button);

    expect(onAdd).not.toHaveBeenCalled();
  });

  it("calls onAdd when username is provided", () => {
    const onAdd = vi.fn();
    render(
      <GuestPlayerOverlay
        isOpen
        username="  Guest  "
        onUsernameChange={() => {}}
        onAdd={onAdd}
        onClose={() => {}}
      />,
    );

    const button = screen.getByRole("button", { name: "Add" });
    fireEvent.click(button);

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("renders error message with aria-describedby", () => {
    render(
      <GuestPlayerOverlay
        isOpen
        username="Guest"
        onUsernameChange={() => {}}
        onAdd={() => {}}
        onClose={() => {}}
        error="Please enter a username"
      />,
    );

    const input = screen.getByLabelText("Username");
    const error = screen.getByText("Please enter a username");

    expect(input.getAttribute("aria-describedby")).toBe(error.getAttribute("id"));
  });

  it("renders suggestions and allows selecting one", () => {
    const onSuggestionClick = vi.fn();
    render(
      <GuestPlayerOverlay
        isOpen
        username="Guest"
        onUsernameChange={() => {}}
        onAdd={() => {}}
        onClose={() => {}}
        error="Username already taken"
        suggestions={["Alex 2", "Alex 3"]}
        onSuggestionClick={onSuggestionClick}
      />,
    );

    const suggestionButton = screen.getByRole("button", { name: "Alex 2" });
    fireEvent.click(suggestionButton);

    expect(onSuggestionClick).toHaveBeenCalledWith("Alex 2");
  });
});
