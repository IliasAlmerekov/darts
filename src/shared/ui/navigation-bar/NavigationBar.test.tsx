// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES } from "@/lib/router/routes";
import useIsomorphicLayoutEffect from "@/shared/lib/useIsomorphicLayoutEffect";
import type { TabletGame } from "@/shared/api/game";
import NavigationBar from "./NavigationBar";
import styles from "./NavigationBar.module.css";

// The highlighted link at each route commit, read before passive effects run.
let highlightAtRouteCommit: string[] = [];

function LocationProbe(): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  useIsomorphicLayoutEffect(() => {
    highlightAtRouteCommit.push(
      screen
        .getAllByRole("link")
        .filter((link) => link.classList.contains(styles.active ?? ""))
        .map((link) => link.textContent ?? "")
        .join(","),
    );
  }, [location.pathname]);
  return (
    <>
      <output data-testid="location">{location.pathname}</output>
      <button type="button" onClick={() => navigate(-1)}>
        History back
      </button>
    </>
  );
}

const LOBBY_7 = { id: 7, status: "lobby" } as const;

function renderAt(...history: string[]): void {
  renderWithGameAt(LOBBY_7, ...history);
}

function renderWithGameAt(tabletGame: TabletGame | null, ...history: string[]): void {
  render(
    <MemoryRouter initialEntries={history} initialIndex={history.length - 1}>
      <NavigationBar tabletGame={tabletGame} />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function currentLocation(): string | null {
  return screen.getByTestId("location").textContent;
}

function historyBack(): void {
  fireEvent.click(screen.getByRole("button", { name: "History back" }));
}

function isHighlighted(name: string): boolean {
  return screen.getByRole("link", { name }).classList.contains(styles.active ?? "");
}

function currentPageName(): string | null {
  const current = screen.getAllByRole("link").filter((link) => link.getAttribute("aria-current"));
  return current.length === 1 ? (current[0]?.textContent ?? null) : null;
}

describe("NavigationBar", () => {
  it("should expose a navigation landmark named Main", () => {
    render(
      <MemoryRouter initialEntries={[ROUTES.statistics]}>
        <NavigationBar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("navigation", { name: "Main" })).toBeInstanceOf(HTMLElement);
  });

  it.each([
    { route: ROUTES.statistics, current: "Statistics", value: "page" },
    { route: ROUTES.details(551), current: "Statistics", value: "true" },
    { route: ROUTES.gamesOverview, current: "Statistics", value: "true" },
    { route: ROUTES.start(), current: "Game", value: "true" },
    { route: ROUTES.start(7), current: "Game", value: "page" },
    { route: ROUTES.settings(), current: "Settings", value: "true" },
    { route: ROUTES.settings(7), current: "Settings", value: "page" },
    { route: "/statistics/", current: "Statistics", value: "page" },
    { route: "/Statistics", current: "Statistics", value: "page" },
    { route: "/GamesOverview/", current: "Statistics", value: "true" },
    { route: "/Start/7/", current: "Game", value: "page" },
    { route: "/SETTINGS", current: "Settings", value: "true" },
  ])("should mark $current with aria-current $value on $route", ({ route, current, value }) => {
    render(
      <MemoryRouter initialEntries={[route]}>
        <NavigationBar tabletGame={LOBBY_7} />
      </MemoryRouter>,
    );

    for (const name of ["Statistics", "Game", "Settings"]) {
      const link = screen.getByRole("link", { name });
      if (name === current) {
        expect(link.getAttribute("aria-current")).toBe(value);
      } else {
        expect(link.hasAttribute("aria-current")).toBe(false);
      }
    }
  });

  it("should show the active icon for the current section", () => {
    render(
      <MemoryRouter initialEntries={[ROUTES.details(551)]}>
        <NavigationBar />
      </MemoryRouter>,
    );

    const statisticsIcon = screen.getByRole("link", { name: "Statistics" }).querySelector("img");

    expect(statisticsIcon?.getAttribute("src")?.includes("inactive")).toBe(false);
  });

  it("should not mark any page as current when the route matches no item", () => {
    render(
      <MemoryRouter initialEntries={[ROUTES.playerProfile]}>
        <NavigationBar />
      </MemoryRouter>,
    );

    for (const name of ["Statistics", "Game", "Settings"]) {
      expect(screen.getByRole("link", { name }).hasAttribute("aria-current")).toBe(false);
    }
  });

  describe("navigation", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should keep the current page until the preview delay has passed, then navigate", () => {
      renderAt(ROUTES.statistics);

      fireEvent.click(screen.getByRole("link", { name: "Game" }));

      expect(currentLocation()).toBe(ROUTES.statistics);
      expect(screen.getByRole("link", { name: "Statistics" }).getAttribute("aria-current")).toBe(
        "page",
      );
      expect(screen.getByRole("link", { name: "Game" }).hasAttribute("aria-current")).toBe(false);

      act(() => {
        vi.advanceTimersByTime(110);
      });

      expect(currentLocation()).toBe(ROUTES.start(7));
      expect(screen.getByRole("link", { name: "Game" }).getAttribute("aria-current")).toBe("page");
    });

    it("should move the current page back when navigating back in history", () => {
      renderAt(ROUTES.statistics);

      fireEvent.click(screen.getByRole("link", { name: "Settings" }));
      act(() => {
        vi.advanceTimersByTime(110);
      });
      expect(currentPageName()).toBe("Settings");

      historyBack();

      expect(currentLocation()).toBe(ROUTES.statistics);
      expect(currentPageName()).toBe("Statistics");
    });

    it.each([
      { modifier: "ctrlKey", init: { ctrlKey: true } },
      { modifier: "metaKey", init: { metaKey: true } },
      { modifier: "shiftKey", init: { shiftKey: true } },
      { modifier: "altKey", init: { altKey: true } },
    ])("should leave a $modifier click to the browser", ({ init }) => {
      renderAt(ROUTES.statistics);
      const gameLink = screen.getByRole("link", { name: "Game" });
      const click = new MouseEvent("click", { bubbles: true, cancelable: true, ...init });
      // jsdom cannot open new tabs, so swallow the native default after React has seen the event.
      const allowedByApp = vi.fn((event: Event) => event.defaultPrevented === false);
      document.addEventListener(
        "click",
        (event) => {
          allowedByApp(event);
          event.preventDefault();
        },
        { once: true },
      );

      fireEvent(gameLink, click);
      act(() => {
        vi.advanceTimersByTime(110);
      });

      expect(allowedByApp).toHaveReturnedWith(true);
      expect(currentLocation()).toBe(ROUTES.statistics);
      expect(currentPageName()).toBe("Statistics");
    });

    it("should do nothing when the current page is clicked", () => {
      renderAt(ROUTES.playerProfile, ROUTES.statistics);

      fireEvent.click(screen.getByRole("link", { name: "Statistics" }));
      act(() => {
        vi.advanceTimersByTime(110);
      });
      expect(currentLocation()).toBe(ROUTES.statistics);

      historyBack();

      expect(currentLocation()).toBe(ROUTES.playerProfile);
    });

    it("should navigate to the section page when its link is clicked from a sub-page", () => {
      renderAt(ROUTES.details(551));

      fireEvent.click(screen.getByRole("link", { name: "Statistics" }));
      act(() => {
        vi.advanceTimersByTime(110);
      });

      expect(currentLocation()).toBe(ROUTES.statistics);
      expect(screen.getByRole("link", { name: "Statistics" }).getAttribute("aria-current")).toBe(
        "page",
      );
    });

    it("should mark a game route as the Game section and navigate to start when no game is active", () => {
      renderWithGameAt(null, ROUTES.start(7));
      const gameLink = screen.getByRole("link", { name: "Game" });
      expect(gameLink.getAttribute("href")).toBe(ROUTES.start());
      expect(gameLink.getAttribute("aria-current")).toBe("true");

      fireEvent.click(gameLink);
      act(() => {
        vi.advanceTimersByTime(110);
      });

      expect(currentLocation()).toBe(ROUTES.start());
      expect(screen.getByRole("link", { name: "Game" }).getAttribute("aria-current")).toBe("page");
    });

    it("should cancel a pending navigation when the route changes during the preview", () => {
      renderAt(ROUTES.playerProfile, ROUTES.statistics);

      fireEvent.click(screen.getByRole("link", { name: "Game" }));
      historyBack();
      act(() => {
        vi.advanceTimersByTime(110);
      });

      expect(currentLocation()).toBe(ROUTES.playerProfile);
    });

    it("should drop the preview when the route changes during the preview", () => {
      renderAt(ROUTES.playerProfile, ROUTES.statistics);

      fireEvent.click(screen.getByRole("link", { name: "Game" }));
      expect(isHighlighted("Game")).toBe(true);

      highlightAtRouteCommit = [];
      historyBack();

      expect(highlightAtRouteCommit).toEqual(["Statistics"]);
      expect(isHighlighted("Game")).toBe(false);
      expect(isHighlighted("Statistics")).toBe(true);
    });

    it("should navigate to the last clicked page when clicking quickly", () => {
      renderAt(ROUTES.statistics);

      fireEvent.click(screen.getByRole("link", { name: "Game" }));
      fireEvent.click(screen.getByRole("link", { name: "Settings" }));
      act(() => {
        vi.advanceTimersByTime(110);
      });

      expect(currentLocation()).toBe(ROUTES.settings(7));
    });
  });
});
