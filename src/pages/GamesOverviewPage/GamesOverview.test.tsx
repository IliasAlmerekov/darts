// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GamesOverviewPage from "./GamesOverview";

// ── Nanostores ──────────────────────────────────────────────────────────────
vi.mock("@nanostores/react", () => ({
  useStore: () => null,
}));

// ── Layout / shared UI ──────────────────────────────────────────────────────
vi.mock("@/shared/ui/admin-layout", () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/ui/statistics-header-controls", () => ({
  StatisticsHeaderControls: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock("@/shared/ui/pagination", () => ({
  Pagination: ({ children }: { children: React.ReactNode }) => <nav>{children}</nav>,
  PaginationContent: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  PaginationItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  PaginationPrevious: ({
    onClick,
    disabled,
  }: {
    onClick: () => void;
    disabled: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      Previous
    </button>
  ),
  PaginationNext: ({
    onClick,
    disabled,
  }: {
    onClick: () => void;
    disabled: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      Next
    </button>
  ),
}));

vi.mock("@/lib/routes", () => ({
  ROUTES: { details: (id: number) => `/games/${id}` },
}));

// ── Hook mock ────────────────────────────────────────────────────────────────
const useGamesOverviewMock = vi.fn();

vi.mock("./useGamesOverview", () => ({
  useGamesOverview: (...args: unknown[]) => useGamesOverviewMock(...args),
}));

const GAMES = [
  { id: 1, winnerRounds: 12, winnerName: "Alice", playersCount: 4, date: "2024-01-15T00:00:00Z" },
  { id: 2, winnerRounds: 8, winnerName: "Bob", playersCount: 3, date: "2024-01-10T00:00:00Z" },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <GamesOverviewPage />
    </MemoryRouter>,
  );
}

describe("GamesOverviewPage", () => {
  beforeEach(() => {
    useGamesOverviewMock.mockReset();
  });

  it("should render loading indicator while data is being fetched", () => {
    useGamesOverviewMock.mockReturnValue({
      loading: true,
      error: null,
      games: [],
      total: 0,
      retry: vi.fn(),
    });

    renderPage();

    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("should render game cards when data loads successfully", () => {
    useGamesOverviewMock.mockReturnValue({
      loading: false,
      error: null,
      games: GAMES,
      total: 2,
      retry: vi.fn(),
    });

    renderPage();

    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("should render error message when hook reports a failure", () => {
    useGamesOverviewMock.mockReturnValue({
      loading: false,
      error: "Could not load games overview",
      games: [],
      total: 0,
      retry: vi.fn(),
    });

    renderPage();

    expect(screen.getByText("Could not load games overview")).toBeTruthy();
  });

  it("should render retry button when hook reports a failure", () => {
    useGamesOverviewMock.mockReturnValue({
      loading: false,
      error: "Could not load games overview",
      games: [],
      total: 0,
      retry: vi.fn(),
    });

    renderPage();

    expect(screen.getByRole("button", { name: /retry/i })).toBeTruthy();
  });

  it("should call retry when retry button is clicked", () => {
    const retryMock = vi.fn();
    useGamesOverviewMock.mockReturnValue({
      loading: false,
      error: "Could not load games overview",
      games: [],
      total: 0,
      retry: retryMock,
    });

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(retryMock).toHaveBeenCalledOnce();
  });

  it("should render empty state message when games list is empty and no error", () => {
    useGamesOverviewMock.mockReturnValue({
      loading: false,
      error: null,
      games: [],
      total: 0,
      retry: vi.fn(),
    });

    renderPage();

    expect(screen.getByText(/no games/i)).toBeTruthy();
  });

  it("should not show error or loading state when data is present", () => {
    useGamesOverviewMock.mockReturnValue({
      loading: false,
      error: null,
      games: GAMES,
      total: 2,
      retry: vi.fn(),
    });

    renderPage();

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });

  it("should render game date, players count, winner name and rounds", () => {
    useGamesOverviewMock.mockReturnValue({
      loading: false,
      error: null,
      games: [GAMES[0]],
      total: 1,
      retry: vi.fn(),
    });

    renderPage();

    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();   // playersCount
    expect(screen.getByText("12")).toBeTruthy();  // winnerRounds
  });

  it("should render detail link for each game card", () => {
    useGamesOverviewMock.mockReturnValue({
      loading: false,
      error: null,
      games: GAMES,
      total: 2,
      retry: vi.fn(),
    });

    renderPage();

    const links = screen.getAllByRole("link", { name: /details/i });
    expect(links).toHaveLength(2);
  });

  it("should display pagination with correct page info", () => {
    useGamesOverviewMock.mockReturnValue({
      loading: false,
      error: null,
      games: GAMES,
      total: 27,
      retry: vi.fn(),
    });

    renderPage();

    // Page 1 of 3 (27 items, limit=9)
    expect(screen.getByText(/page 1 of/i)).toBeTruthy();
  });
});
