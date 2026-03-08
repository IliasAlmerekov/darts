// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StatisticsPage from "./Statistics";

// ── Nanostores ──────────────────────────────────────────────────────────────
vi.mock("@nanostores/react", () => ({
  useStore: () => null,
}));

// ── Layout / shared UI ──────────────────────────────────────────────────────
vi.mock("@/shared/ui/admin-layout", () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/ui/statistics-header-controls", () => ({
  StatisticsHeaderControls: ({
    title,
    onSortChange,
  }: {
    title: string;
    onSortChange?: (v: string) => void;
  }) => (
    <div>
      <h1>{title}</h1>
      {onSortChange && <button onClick={() => onSortChange("score")}>Sort by score</button>}
    </div>
  ),
}));

vi.mock("@/shared/ui/pagination", () => ({
  Pagination: ({ children }: { children: React.ReactNode }) => <nav>{children}</nav>,
  PaginationContent: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  PaginationItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  PaginationPrevious: ({ onClick, disabled }: { onClick: () => void; disabled: boolean }) => (
    <button onClick={onClick} disabled={disabled}>
      Previous
    </button>
  ),
  PaginationNext: ({ onClick, disabled }: { onClick: () => void; disabled: boolean }) => (
    <button onClick={onClick} disabled={disabled}>
      Next
    </button>
  ),
}));

// ── Hook mock ────────────────────────────────────────────────────────────────
const usePlayerStatsMock = vi.fn();

vi.mock("./usePlayerStats", () => ({
  usePlayerStats: (...args: unknown[]) => usePlayerStatsMock(...args),
}));

const PLAYERS = [
  { id: 1, playerId: 1, name: "Alice", scoreAverage: 55.5, gamesPlayed: 10 },
  { id: 2, playerId: 2, name: "Bob", scoreAverage: 40.0, gamesPlayed: 5 },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <StatisticsPage />
    </MemoryRouter>,
  );
}

describe("StatisticsPage", () => {
  beforeEach(() => {
    usePlayerStatsMock.mockReset();
  });

  it("should render loading indicator while data is being fetched", () => {
    usePlayerStatsMock.mockReturnValue({
      loading: true,
      error: null,
      stats: [],
      total: 0,
      retry: vi.fn(),
    });

    renderPage();

    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("should render player list when data loads successfully", () => {
    usePlayerStatsMock.mockReturnValue({
      loading: false,
      error: null,
      stats: PLAYERS,
      total: 2,
      retry: vi.fn(),
    });

    renderPage();

    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("should render error message when hook reports a failure", () => {
    usePlayerStatsMock.mockReturnValue({
      loading: false,
      error: "Could not load player statistics",
      stats: [],
      total: 0,
      retry: vi.fn(),
    });

    renderPage();

    expect(screen.getByText("Could not load player statistics")).toBeTruthy();
  });

  it("should render retry button when hook reports a failure", () => {
    usePlayerStatsMock.mockReturnValue({
      loading: false,
      error: "Could not load player statistics",
      stats: [],
      total: 0,
      retry: vi.fn(),
    });

    renderPage();

    expect(screen.getByRole("button", { name: /retry/i })).toBeTruthy();
  });

  it("should call retry when retry button is clicked", () => {
    const retryMock = vi.fn();
    usePlayerStatsMock.mockReturnValue({
      loading: false,
      error: "Could not load player statistics",
      stats: [],
      total: 0,
      retry: retryMock,
    });

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(retryMock).toHaveBeenCalledOnce();
  });

  it("should render empty state message when stats list is empty and no error", () => {
    usePlayerStatsMock.mockReturnValue({
      loading: false,
      error: null,
      stats: [],
      total: 0,
      retry: vi.fn(),
    });

    renderPage();

    expect(screen.getByText(/no player statistics/i)).toBeTruthy();
  });

  it("should not show error or loading state when data is present", () => {
    usePlayerStatsMock.mockReturnValue({
      loading: false,
      error: null,
      stats: PLAYERS,
      total: 2,
      retry: vi.fn(),
    });

    renderPage();

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });

  it("should display pagination with correct page info", () => {
    usePlayerStatsMock.mockReturnValue({
      loading: false,
      error: null,
      stats: PLAYERS,
      total: 25,
      retry: vi.fn(),
    });

    renderPage();

    // Page 1 of 3 (25 items, limit=10)
    expect(screen.getByText(/page 1 of/i)).toBeTruthy();
  });

  it("should display player score average", () => {
    usePlayerStatsMock.mockReturnValue({
      loading: false,
      error: null,
      stats: [{ id: 1, playerId: 1, name: "Alice", scoreAverage: 55.5, gamesPlayed: 10 }],
      total: 1,
      retry: vi.fn(),
    });

    renderPage();

    expect(screen.getByText("55.5")).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy();
  });
});
