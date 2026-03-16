// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ScrollToTop from "./ScrollToTop";

function TestShell(): JSX.Element {
  return (
    <MemoryRouter initialEntries={["/statistics"]}>
      <ScrollToTop />
      <nav>
        <Link to="/statistics">Statistics</Link>
        <Link to="/start">Game</Link>
      </nav>
      <Routes>
        <Route path="/statistics" element={<div>Statistics page</div>} />
        <Route path="/start" element={<div>Start page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ScrollToTop", () => {
  beforeEach(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call window.scrollTo on initial render and route changes when the browser API is available", () => {
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    render(<TestShell />);

    fireEvent.click(screen.getByRole("link", { name: "Game" }));

    expect(scrollToSpy).toHaveBeenNthCalledWith(1, 0, 0);
    expect(scrollToSpy).toHaveBeenNthCalledWith(2, 0, 0);
  });

  it("should reset document scroll positions when window.scrollTo throws during navigation", () => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {
      throw new Error("scroll failed");
    });

    document.documentElement.scrollTop = 120;
    document.body.scrollTop = 80;

    render(<TestShell />);

    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);

    document.documentElement.scrollTop = 220;
    document.body.scrollTop = 140;

    fireEvent.click(screen.getByRole("link", { name: "Game" }));

    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);
  });
});
