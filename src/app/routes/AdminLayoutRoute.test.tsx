// @vitest-environment jsdom
const useStoreMock = vi.fn();

vi.mock("@nanostores/react", () => ({
  useStore: (...args: unknown[]) => useStoreMock(...args),
}));

vi.mock("@/shared/ui/admin-layout", () => ({
  AdminLayout: ({
    children,
    currentGameId,
  }: {
    children: ReactNode;
    currentGameId?: number | null;
  }) => (
    <div data-testid="admin-layout" data-current-game-id={currentGameId ?? ""}>
      {children}
    </div>
  ),
}));

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminLayoutRoute from "./AdminLayoutRoute";

describe("AdminLayoutRoute", () => {
  it("should render the admin shell around the outlet content when the store provides the current game id", () => {
    useStoreMock.mockReturnValue(42);

    render(
      <MemoryRouter initialEntries={["/statistics"]}>
        <Routes>
          <Route element={<AdminLayoutRoute />}>
            <Route path="/statistics" element={<div>Statistics Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("admin-layout").getAttribute("data-current-game-id")).toBe("42");
    expect(screen.getByText("Statistics Page")).toBeTruthy();
  });
});
