import React from "react";
import { ErrorState } from "@/shared/ui/error-state";
import { ProfileTabs } from "./components/ProfileTabs";
import { StatsCard } from "./components/StatsCard";
import { usePlayerProfilePage } from "./usePlayerProfilePage";
import styles from "./PlayerProfilePage.module.css";

function PlayerProfilePage(): React.JSX.Element {
  const { displayName, profileState, tab, selectTab } = usePlayerProfilePage();

  return (
    <main className={styles.playerProfile}>
      <h1 className={styles.pageTitle}>Player Profile</h1>
      <div className={styles.profileLayout}>
        <StatsCard displayName={displayName} profileState={profileState} />
        {profileState.status === "error" ? (
          <ErrorState
            title="Could not load your profile"
            message={profileState.message}
            primaryAction={{ label: "Retry", onClick: profileState.retry }}
          />
        ) : (
          <ProfileTabs tab={tab} onSelectTab={selectTab} profileState={profileState} />
        )}
      </div>
    </main>
  );
}

export default PlayerProfilePage;
