import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStore } from "@nanostores/react";
import settingsCogInactive from "@/assets/icons/settings-inactive.svg";
import settingsCog from "@/assets/icons/settings.svg";
import dartIcon from "@/assets/icons/dart.svg";
import dartIconInactive from "@/assets/icons/dart-inactive.svg";
import statisticIcon from "@/assets/icons/statistics.svg";
import statisticIconInactive from "@/assets/icons/statistics-inactive.svg";
import styles from "./NavigationBar.module.css";
import Madebydeepblue from "@/assets/icons/madeByDeepblue.svg";
import clsx from "clsx";
import { $currentGameId } from "@/stores";

type NavigationBarProps = {
  className?: string;
};

function NavigationBar({ className }: NavigationBarProps): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const currentGameId = useStore($currentGameId);
  const [previewTabId, setPreviewTabId] = useState<string | null>(null);
  const navigationTimerRef = useRef<number | null>(null);

  // Dynamischer path für Game basierend auf currentGameId
  const gamePath = useMemo(() => {
    return currentGameId ? `/start/${currentGameId}` : "/start";
  }, [currentGameId]);

  // Dynamischer path für Settings basierend auf currentGameId
  const settingsPath = useMemo(() => {
    return currentGameId ? `/settings/${currentGameId}` : "/settings";
  }, [currentGameId]);

  const navItems = useMemo(
    () => [
      {
        label: "Statistics",
        activeIcon: statisticIcon,
        inActiveIcon: statisticIconInactive,
        id: "statistics",
        path: "/statistics",
      },
      {
        label: "Game",
        activeIcon: dartIcon,
        inActiveIcon: dartIconInactive,
        id: "game",
        path: gamePath,
      },
      {
        label: "Settings",
        activeIcon: settingsCog,
        inActiveIcon: settingsCogInactive,
        id: "settings",
        path: settingsPath,
      },
    ],
    [gamePath, settingsPath],
  );

  const getIsActive = (itemId: string, itemPath: string): boolean => {
    return (
      location.pathname === itemPath ||
      (itemId === "game" &&
        (location.pathname === "/start" || location.pathname.startsWith("/start/"))) ||
      (itemId === "statistics" &&
        (location.pathname === "/gamesoverview" || location.pathname.startsWith("/details/"))) ||
      (itemId === "settings" && location.pathname.startsWith("/settings"))
    );
  };

  const activeTabId = navItems.find((item) => getIsActive(item.id, item.path))?.id ?? "statistics";
  const displayedTabId = previewTabId ?? activeTabId;

  useEffect(() => {
    setPreviewTabId(null);
  }, [location.pathname]);

  useEffect(() => {
    return () => {
      if (navigationTimerRef.current !== null) {
        window.clearTimeout(navigationTimerRef.current);
      }
    };
  }, []);

  const handleTabClick = (path: string, itemId: string) => {
    if (itemId === activeTabId) {
      return;
    }

    setPreviewTabId(itemId);
    if (navigationTimerRef.current !== null) {
      window.clearTimeout(navigationTimerRef.current);
    }

    // Keep a short window for the sliding indicator to be perceptible.
    navigationTimerRef.current = window.setTimeout(() => {
      navigate(path);
    }, 110);
  };

  return (
    <div className={clsx(styles.navigation, className)}>
      <img className={styles.deepblueIcon} src={Madebydeepblue} alt="" />
      <div
        className={clsx(styles.navItems, {
          [styles.activeStatistics]: displayedTabId === "statistics",
          [styles.activeGame]: displayedTabId === "game",
          [styles.activeSettings]: displayedTabId === "settings",
        })}
      >
        {navItems.map((item) => {
          const isDisplayedActive = displayedTabId === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.path, item.id)}
              className={clsx(styles.tabButton, {
                [styles.active]: displayedTabId === item.id,
                [styles.inactive]: displayedTabId !== item.id,
              })}
            >
              <span className={styles.tabContent}>
                <img
                  src={isDisplayedActive ? item.activeIcon : item.inActiveIcon}
                  alt={item.label}
                />
                <span className={styles.tabLabel}>{item.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(NavigationBar);
