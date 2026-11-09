import React from "react";
import madeByDeepblue from "@/assets/icons/madeByDeepblue.svg";
import { ROUTES } from "@/lib/router/routes";
import { BackButton } from "@/shared/ui/back-button";
import { ErrorState } from "@/shared/ui/error-state";
import {
  ProfileMessage,
  ProfileStatisticsOverview,
  ProfileStatsCard,
} from "@/shared/ui/profile-statistics";
import { usePublicProfilePage, type PublicProfileState } from "./usePublicProfilePage";
import styles from "./PublicProfilePage.module.css";

const BACK_LABEL = "Back to my profile";

function renderContent(state: PublicProfileState): React.JSX.Element {
  switch (state.status) {
    case "pending":
      return <ProfileMessage isStatus>Loading…</ProfileMessage>;
    case "not-found":
      return (
        <ErrorState
          title="Player not found"
          message="This player has no public profile."
          primaryAction={{ label: BACK_LABEL, to: ROUTES.playerProfile }}
        />
      );
    case "error":
      return (
        <ErrorState
          title="Could not load this profile"
          message={state.message}
          primaryAction={{ label: "Retry", onClick: state.retry }}
        />
      );
    case "success": {
      const { profile } = state;
      return (
        <div className={styles.content}>
          <h1 className={styles.pageTitle}>{`${profile.displayName}'s profile`}</h1>
          <ProfileStatsCard
            className={styles.card}
            playerId={profile.playerId}
            displayName={profile.displayName}
            stats={profile.stats}
            isPending={false}
          />
          <div className={styles.panel}>
            <ProfileStatisticsOverview
              statistics={profile}
              displayName={profile.displayName}
              isOwnProfile={false}
            />
          </div>
        </div>
      );
    }
  }
}

/** Another player's Public profile: name, avatar and the statistics of their Profile. */
function PublicProfilePage(): React.JSX.Element {
  const state = usePublicProfilePage();

  return (
    <div className={styles.page}>
      <header className={styles.navRow}>
        <BackButton to={ROUTES.playerProfile} label={BACK_LABEL} />
        <img className={styles.brand} src={madeByDeepblue} alt="" />
      </header>
      <main className={styles.publicProfile}>{renderContent(state)}</main>
    </div>
  );
}

export default PublicProfilePage;
