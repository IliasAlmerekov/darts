import React, { useEffect, useRef, useState, useCallback } from "react";
import clsx from "clsx";
import styles from "./ViewToogleBtn.module.css";
import { Link, matchPath, useLocation, useNavigate } from "react-router-dom";
import { isPlainLeftClick } from "@/lib/router/isPlainLeftClick";
import { ROUTES } from "@/lib/router/routes";

function ViewToogleButton(): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();

  // aria-current follows the real route only; the visual highlight may show a preview or fallback.
  // matchPath ignores case and a trailing slash, as the router does when it renders the page.
  const activeView =
    matchPath(ROUTES.gamesOverview, location.pathname) !== null
      ? "games"
      : matchPath(ROUTES.statistics, location.pathname) !== null
        ? "players"
        : null;
  const [preview, setPreview] = useState<{
    pathname: string;
    view: "players" | "games";
  } | null>(null);
  const timerRef = useRef<number | null>(null);

  // A route change (e.g. Back) during the preview wins over the pending navigation.
  if (preview !== null && preview.pathname !== location.pathname) {
    setPreview(null);
  }
  const displayedView = preview?.view ?? activeView ?? "players";

  // The cleanup runs on every route change and on unmount, and cancels the pending navigation.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [location.pathname]);

  const handleSwitch = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, targetView: "players" | "games"): void => {
      if (!isPlainLeftClick(event)) {
        // Let the browser open the link in a new tab or window.
        return;
      }

      event.preventDefault();
      if (targetView === activeView) {
        return;
      }

      setPreview({ pathname: location.pathname, view: targetView });

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        navigate(targetView === "players" ? ROUTES.statistics : ROUTES.gamesOverview);
      }, 180);
    },
    [activeView, location.pathname, navigate],
  );

  return (
    <nav
      aria-label="Statistics view"
      className={clsx(styles.viewToggle, {
        [styles.viewPlayers ?? ""]: displayedView === "players",
        [styles.viewGames ?? ""]: displayedView === "games",
      })}
    >
      <Link
        to={ROUTES.statistics}
        aria-current={activeView === "players" ? "page" : undefined}
        className={clsx(styles.viewButton, {
          [styles.activeBtn ?? ""]: displayedView === "players",
        })}
        onClick={(event) => handleSwitch(event, "players")}
      >
        Players
      </Link>
      <Link
        to={ROUTES.gamesOverview}
        aria-current={activeView === "games" ? "page" : undefined}
        className={clsx(styles.viewButton, {
          [styles.activeBtn ?? ""]: displayedView === "games",
        })}
        onClick={(event) => handleSwitch(event, "games")}
      >
        Games
      </Link>
    </nav>
  );
}

export default React.memo(ViewToogleButton);
