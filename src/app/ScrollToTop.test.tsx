// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
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
  it("scrolls to the top on initial render and route changes", () => {
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
