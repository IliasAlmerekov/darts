import React, { useEffect, useRef, useState, useCallback } from "react";
import clsx from "clsx";
import styles from "./ViewToogleBtn.module.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { isPlainLeftClick } from "@/lib/router/isPlainLeftClick";
import { ROUTES } from "@/lib/router/routes";

function ViewToogleButton(): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();

  // aria-current follows the real route only; the visual highlight may show a preview or fallback.
  const activeView =
    location.pathname === ROUTES.gamesOverview
      ? "games"
      : location.pathname === ROUTES.statistics
        ? "players"
        : null;
  const [previewView, setPreviewView] = useState<"players" | "games" | null>(null);
  const timerRef = useRef<number | null>(null);
  const displayedView = previewView ?? activeView ?? "players";

  useEffect(() => {
    // A route change (e.g. Back) during the preview wins over the pending navigation.
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPreviewView(null);
  }, [location.pathname]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

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

      setPreviewView(targetView);

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        navigate(targetView === "players" ? ROUTES.statistics : ROUTES.gamesOverview);
      }, 180);
    },
    [activeView, navigate],
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
