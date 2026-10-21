import React from "react";
import barChartIcon from "@/assets/icons/bar-chart.svg";
import type { PlayerProfile } from "@/lib/player/profile";
import { ProfileBlock } from "./ProfileBlock";
import { ScoringTrendChart } from "./ScoringTrendChart";
import styles from "./PerformanceTab.module.css";

interface PerformanceTabProps {
  profile: PlayerProfile;
}

export function PerformanceTab({ profile }: PerformanceTabProps): React.JSX.Element {
  return (
    <ProfileBlock title="Scoring trend" iconSrc={barChartIcon}>
      <ScoringTrendChart points={profile.scoringTrend} isLarge />
      {profile.scoringTrend.length > 0 ? (
        <ol className={styles.averageList} aria-label="Round average per game">
          {profile.scoringTrend.map((point) => (
            <li key={point.gameId} className={styles.averageItem}>
              {point.label}
            </li>
          ))}
        </ol>
      ) : null}
    </ProfileBlock>
  );
}
