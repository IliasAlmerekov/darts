import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, matchPath, useNavigate, useLocation } from "react-router-dom";
import { isPlainLeftClick } from "@/lib/router/isPlainLeftClick";
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

  // aria-current follows the real route only; the visual highlight may show a preview or fallback.
  // "page" when the link targets exactly this URL, "true" when we are elsewhere in its section.
  const activeTabId = navItems.find((item) => getIsActive(item.id, item.path))?.id ?? null;
  const displayedTabId = previewTabId ?? activeTabId ?? "statistics";

  const getAriaCurrent = (itemId: string, itemPath: string): "page" | "true" | undefined => {
    if (itemId !== activeTabId) {
      return undefined;
    }
    return itemPath === location.pathname ? "page" : "true";
  };

  useEffect(() => {
    // A route change (e.g. Back) during the preview wins over the pending navigation.
    if (navigationTimerRef.current !== null) {
      window.clearTimeout(navigationTimerRef.current);
      navigationTimerRef.current = null;
    }
    setPreviewTabId(null);
  }, [location.pathname]);

  useEffect(() => {
    return () => {
      if (navigationTimerRef.current !== null) {
        window.clearTimeout(navigationTimerRef.current);
      }
    };
  }, []);

  const handleTabClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    path: string,
    itemId: string,
  ): void => {
    if (!isPlainLeftClick(event)) {
      // Let the browser open the link in a new tab or window.
      return;
    }

    event.preventDefault();
    if (path === location.pathname) {
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
    <nav aria-label="Main" className={clsx(styles.navigation, className)}>
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
            <Link
              key={item.id}
              to={item.path}
              aria-current={getAriaCurrent(item.id, item.path)}
              onClick={(event) => handleTabClick(event, item.path, item.id)}
              className={clsx(styles.tabButton, {
                [styles.active ?? ""]: displayedTabId === item.id,
                [styles.inactive ?? ""]: displayedTabId !== item.id,
              })}
            >
              <span className={styles.tabContent}>
                <img src={isDisplayedActive ? item.activeIcon : item.inActiveIcon} alt="" />
                <span className={styles.tabLabel}>{item.label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default React.memo(NavigationBar);
