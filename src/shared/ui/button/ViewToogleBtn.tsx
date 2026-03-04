import React, { useEffect, useRef, useState, useCallback } from "react";
import clsx from "clsx";
import styles from "./ViewToogleBtn.module.css";
import { useLocation, useNavigate } from "react-router-dom";

function ViewToogleButton() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeView = location.pathname === "/gamesoverview" ? "games" : "players";
  const [previewView, setPreviewView] = useState<"players" | "games" | null>(null);
  const timerRef = useRef<number | null>(null);
  const displayedView = previewView ?? activeView;

  useEffect(() => {
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
    (targetView: "players" | "games"): void => {
      if (targetView === activeView) {
        return;
      }

      setPreviewView(targetView);

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        navigate(targetView === "players" ? "/statistics" : "/gamesoverview");
      }, 180);
    },
    [activeView, navigate],
  );

  return (
    <div
      className={clsx(styles.viewToggle, {
        [styles.viewPlayers]: displayedView === "players",
        [styles.viewGames]: displayedView === "games",
      })}
    >
      <button
        className={clsx(styles.viewButton, {
          [styles.activeBtn]: displayedView === "players",
        })}
        onClick={() => handleSwitch("players")}
      >
        Players
      </button>
      <button
        className={clsx(styles.viewButton, {
          [styles.activeBtn]: displayedView === "games",
        })}
        onClick={() => handleSwitch("games")}
      >
        Games
      </button>
    </div>
  );
}

export default React.memo(ViewToogleButton);
