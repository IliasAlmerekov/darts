import React, { useEffect, useMemo, useRef, useState } from "react";
import { matchPath, useNavigate, useLocation } from "react-router-dom";
import { ROUTES } from "@/lib/router/routes";
import settingsCogInactive from "@/assets/icons/settings-inactive.svg";
import settingsCog from "@/assets/icons/settings.svg";
import dartIcon from "@/assets/icons/dart.svg";
import dartIconInactive from "@/assets/icons/dart-inactive.svg";
import statisticIcon from "@/assets/icons/statistics.svg";
import statisticIconInactive from "@/assets/icons/statistics-inactive.svg";
import styles from "./NavigationBar.module.css";
import Madebydeepblue from "@/assets/icons/madeByDeepblue.svg";
import clsx from "clsx";

interface NavigationBarProps {
  className?: string;
  currentGameId?: number | null;
}

function NavigationBar({ className, currentGameId = null }: NavigationBarProps): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [previewTabId, setPreviewTabId] = useState<string | null>(null);
  const navigationTimerRef = useRef<number | null>(null);

  const gamePath = useMemo(() => {
    return ROUTES.start(currentGameId ?? undefined);
  }, [currentGameId]);

  const settingsPath = useMemo(() => {
    return ROUTES.settings(currentGameId ?? undefined);
  }, [currentGameId]);

  const navItems = useMemo(
    () => [
      {
        label: "Statistics",
        activeIcon: statisticIcon,
        inActiveIcon: statisticIconInactive,
        id: "statistics",
        path: ROUTES.statistics,
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
        (location.pathname === ROUTES.start() ||
          location.pathname.startsWith(ROUTES.start() + "/"))) ||
      (itemId === "statistics" &&
        (location.pathname === ROUTES.gamesOverview ||
          matchPath(ROUTES.detailsPattern, location.pathname) !== null)) ||
      (itemId === "settings" && location.pathname.startsWith(ROUTES.settings()))
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

  const handleTabClick = (path: string, itemId: string): void => {
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
          [styles.activeStatistics ?? ""]: displayedTabId === "statistics",
          [styles.activeGame ?? ""]: displayedTabId === "game",
          [styles.activeSettings ?? ""]: displayedTabId === "settings",
        })}
      >
        {navItems.map((item) => {
          const isDisplayedActive = displayedTabId === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.path, item.id)}
              className={clsx(styles.tabButton, {
                [styles.active ?? ""]: displayedTabId === item.id,
                [styles.inactive ?? ""]: displayedTabId !== item.id,
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
