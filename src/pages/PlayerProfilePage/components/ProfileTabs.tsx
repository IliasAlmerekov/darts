import React, { useRef } from "react";
import clsx from "clsx";
import { ErrorState } from "@/shared/ui/error-state";
import { PROFILE_TAB_LABELS, PROFILE_TABS, type ProfileTab } from "../lib/profilePage";
import type { ProfileState } from "../usePlayerProfilePage";
import { HistoryTab } from "./HistoryTab";
import { OverviewTab } from "./OverviewTab";
import { PerformanceTab } from "./PerformanceTab";
import { ProfileMessage } from "./ProfileMessage";
import styles from "./ProfileTabs.module.css";

interface ProfileTabListProps {
  idPrefix: string;
  tab: ProfileTab;
  onSelectTab: (tab: ProfileTab) => void;
}

interface ProfileTabPanelProps {
  idPrefix: string;
  tab: ProfileTab;
  displayName: string;
  profileState: ProfileState;
  className?: string | undefined;
}

// The sliding indicator under the selected tab, as in the admin navigation bar.
const INDICATOR_CLASSES: Record<ProfileTab, string | undefined> = {
  overview: styles.indicatorOverview,
  performance: styles.indicatorPerformance,
  history: styles.indicatorHistory,
};

const KEY_STEPS: Partial<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 };

function tabId(idPrefix: string, tab: ProfileTab): string {
  return `${idPrefix}-tab-${tab}`;
}

function panelId(idPrefix: string, tab: ProfileTab): string {
  return `${idPrefix}-panel-${tab}`;
}

function renderPanel(
  tab: ProfileTab,
  displayName: string,
  profileState: ProfileState,
): React.JSX.Element {
  if (profileState.status === "pending") {
    return <ProfileMessage isStatus>Loading…</ProfileMessage>;
  }
  if (profileState.status === "error") {
    return (
      <ErrorState
        title="Could not load your profile"
        message={profileState.message}
        primaryAction={{ label: "Retry", onClick: profileState.retry }}
      />
    );
  }
  switch (tab) {
    case "overview":
      return <OverviewTab profile={profileState.profile} displayName={displayName} />;
    case "performance":
      return <PerformanceTab profile={profileState.profile} />;
    case "history":
      return <HistoryTab profile={profileState.profile} />;
  }
}

/** Overview, Performance and History, the player's navigation, as WAI-ARIA tabs. */
export function ProfileTabList({
  idPrefix,
  tab,
  onSelectTab,
}: ProfileTabListProps): React.JSX.Element {
  const tabRefs = useRef<Partial<Record<ProfileTab, HTMLButtonElement | null>>>({});

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    const currentIndex = PROFILE_TABS.indexOf(tab);
    let nextIndex: number | undefined;
    const step = KEY_STEPS[event.key];
    if (step !== undefined) {
      nextIndex = (currentIndex + step + PROFILE_TABS.length) % PROFILE_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = PROFILE_TABS.length - 1;
    }
    const nextTab = nextIndex === undefined ? undefined : PROFILE_TABS[nextIndex];
    if (nextTab === undefined) {
      return;
    }
    event.preventDefault();
    onSelectTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  return (
    <div
      className={clsx(styles.tabList, INDICATOR_CLASSES[tab])}
      role="tablist"
      aria-label="Profile sections"
    >
      {PROFILE_TABS.map((item) => {
        const isSelected = item === tab;
        return (
          <button
            key={item}
            ref={(element) => {
              tabRefs.current[item] = element;
            }}
            className={clsx(styles.tab, { [styles.tabActive ?? ""]: isSelected })}
            id={tabId(idPrefix, item)}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={panelId(idPrefix, item)}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelectTab(item)}
            onKeyDown={handleKeyDown}
          >
            {PROFILE_TAB_LABELS[item]}
          </button>
        );
      })}
    </div>
  );
}

/** The selected tab's content, or the one profile error with Retry. */
export function ProfileTabPanel({
  idPrefix,
  tab,
  displayName,
  profileState,
  className,
}: ProfileTabPanelProps): React.JSX.Element {
  return (
    <div
      className={clsx(styles.tabPanel, className)}
      id={panelId(idPrefix, tab)}
      role="tabpanel"
      aria-labelledby={tabId(idPrefix, tab)}
      aria-busy={profileState.status === "pending"}
      tabIndex={0}
    >
      {renderPanel(tab, displayName, profileState)}
    </div>
  );
}
