// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES } from "@/lib/router/routes";
import ViewToogleButton from "./ViewToogleBtn";

function LocationProbe(): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="location">{location.pathname}</output>
      <button type="button" onClick={() => navigate(-1)}>
        History back
      </button>
    </>
  );
}

function renderAt(...history: string[]): void {
  render(
    <MemoryRouter initialEntries={history} initialIndex={history.length - 1}>
      <ViewToogleButton />
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

function currentPageName(): string | null {
  const current = screen.getAllByRole("link").filter((link) => link.getAttribute("aria-current"));
  return current.length === 1 ? (current[0]?.textContent ?? null) : null;
}

describe("ViewToogleButton", () => {
  it("should expose a navigation landmark named Statistics view", () => {
    renderAt(ROUTES.statistics);

    expect(screen.getByRole("navigation", { name: "Statistics view" })).toBeInstanceOf(HTMLElement);
  });

  it.each([
    { route: ROUTES.statistics, current: "Players" },
    { route: ROUTES.gamesOverview, current: "Games" },
  ])("should mark $current as the current page on $route", ({ route, current }) => {
    renderAt(route);

    expect(screen.getByRole("link", { name: "Players" }).getAttribute("href")).toBe(
      ROUTES.statistics,
    );
    expect(screen.getByRole("link", { name: "Games" }).getAttribute("href")).toBe(
      ROUTES.gamesOverview,
    );
    expect(currentPageName()).toBe(current);
  });

  it("should not mark any view as current when the route matches neither view", () => {
    renderAt(ROUTES.details(551));

    for (const name of ["Players", "Games"]) {
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

      fireEvent.click(screen.getByRole("link", { name: "Games" }));

      expect(currentLocation()).toBe(ROUTES.statistics);
      expect(currentPageName()).toBe("Players");

      act(() => {
        vi.advanceTimersByTime(180);
      });

      expect(currentLocation()).toBe(ROUTES.gamesOverview);
      expect(currentPageName()).toBe("Games");
    });

    it("should move the current page back when navigating back in history", () => {
      renderAt(ROUTES.statistics);

      fireEvent.click(screen.getByRole("link", { name: "Games" }));
      act(() => {
        vi.advanceTimersByTime(180);
      });
      historyBack();

      expect(currentLocation()).toBe(ROUTES.statistics);
      expect(currentPageName()).toBe("Players");
    });

    it("should do nothing when the current page is clicked", () => {
      renderAt(ROUTES.playerProfile, ROUTES.statistics);

      fireEvent.click(screen.getByRole("link", { name: "Players" }));
      act(() => {
        vi.advanceTimersByTime(180);
      });
      expect(currentLocation()).toBe(ROUTES.statistics);

      historyBack();

      expect(currentLocation()).toBe(ROUTES.playerProfile);
    });

    it.each([
      { modifier: "ctrlKey", init: { ctrlKey: true } },
      { modifier: "metaKey", init: { metaKey: true } },
      { modifier: "shiftKey", init: { shiftKey: true } },
      { modifier: "altKey", init: { altKey: true } },
    ])("should leave a $modifier click to the browser", ({ init }) => {
      renderAt(ROUTES.statistics);
      const gamesLink = screen.getByRole("link", { name: "Games" });
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

      fireEvent(gamesLink, click);
      act(() => {
        vi.advanceTimersByTime(180);
      });

      expect(allowedByApp).toHaveReturnedWith(true);
      expect(currentLocation()).toBe(ROUTES.statistics);
      expect(currentPageName()).toBe("Players");
    });

    it("should navigate when a view is clicked from a route that matches neither view", () => {
      renderAt(ROUTES.details(551));

      fireEvent.click(screen.getByRole("link", { name: "Players" }));
      expect(currentLocation()).toBe(ROUTES.details(551));

      act(() => {
        vi.advanceTimersByTime(180);
      });

      expect(currentLocation()).toBe(ROUTES.statistics);
      expect(currentPageName()).toBe("Players");
    });

    it("should cancel a pending navigation when the route changes during the preview", () => {
      renderAt(ROUTES.playerProfile, ROUTES.statistics);

      fireEvent.click(screen.getByRole("link", { name: "Games" }));
      historyBack();
      act(() => {
        vi.advanceTimersByTime(180);
      });

      expect(currentLocation()).toBe(ROUTES.playerProfile);
    });
  });
});
