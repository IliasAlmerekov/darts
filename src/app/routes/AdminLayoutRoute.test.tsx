// @vitest-environment jsdom
vi.mock("@/shared/api/game", () => ({
  getTabletGame: vi.fn(),
}));

import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTabletGame } from "@/shared/api/game";
import { createQueryClient } from "@/shared/query/queryClient";
import AdminLayoutRoute from "./AdminLayoutRoute";

function renderStatistics(): void {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={["/statistics"]}>
        <Routes>
          <Route element={<AdminLayoutRoute />}>
            <Route path="/statistics" element={<div>Statistics Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AdminLayoutRoute", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should render the outlet and link the tabs to the tablet game it reads", async () => {
    vi.mocked(getTabletGame).mockResolvedValue({
      game: { id: 42, status: "lobby" },
      lastFinishedGameId: null,
    });

    renderStatistics();

    expect(screen.getByText("Statistics Page")).toBeTruthy();
    await vi.waitFor(() => {
      expect(screen.getByRole("link", { name: "Game" }).getAttribute("href")).toBe("/start/42");
    });
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe(
      "/settings/42",
    );
  });

  it("should link the tabs to the bare pages while the tablet game is unknown", () => {
    vi.mocked(getTabletGame).mockReturnValue(new Promise(() => {}));

    renderStatistics();

    expect(screen.getByRole("link", { name: "Game" }).getAttribute("href")).toBe("/start");
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe("/settings");
  });
});
