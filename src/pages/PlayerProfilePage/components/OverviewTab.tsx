import React from "react";
import barChartIcon from "@/assets/icons/bar-chart.svg";
import targetIcon from "@/assets/icons/target.svg";
import trophyIcon from "@/assets/icons/trophy.svg";
import type { PlayerProfile } from "@/lib/player/profile";
import { SAMPLE_PROFILE } from "../lib/sampleProfile";
import { HitDistribution } from "./HitDistribution";
import { ProfileBlock } from "./ProfileBlock";
import { ScoringTrendChart } from "./ScoringTrendChart";
import styles from "./OverviewTab.module.css";

interface OverviewTabProps {
  profile: PlayerProfile;
}

export function OverviewTab({ profile }: OverviewTabProps): React.JSX.Element {
  const { favoriteDoubles, highestFinish, mostHitSegment } = SAMPLE_PROFILE;

  return (
    <div className={styles.overview}>
      <ProfileBlock
        className={styles.hitDistributionBlock}
        title="Hit distribution"
        iconSrc={targetIcon}
        isSample
      >
        <HitDistribution />
      </ProfileBlock>

      <ProfileBlock title="Favorite doubles" iconSrc={targetIcon} isSample>
        <ol className={styles.doublesList}>
          {favoriteDoubles.map((double) => (
            <li key={double.segment} className={styles.doubleItem}>
              <span className={styles.highlight}>{double.segment}</span>
              <span>{Math.round((double.hits / double.attempts) * 100)}%</span>
              <span className={styles.muted}>
                {double.hits} / {double.attempts}
              </span>
            </li>
          ))}
        </ol>
      </ProfileBlock>

      <ProfileBlock title="Highest finish" iconSrc={trophyIcon} isSample>
        <p className={styles.bigValue}>{highestFinish.score}</p>
        <p className={styles.muted}>
          {highestFinish.darts} darts · {highestFinish.throws.join(" · ")}
        </p>
      </ProfileBlock>

      <ProfileBlock title="Most hit segment" iconSrc={targetIcon} isSample>
        <p className={styles.bigValue}>{mostHitSegment.segment}</p>
        <p className={styles.muted}>{mostHitSegment.share}% of all throws</p>
        <p className={styles.muted}>{mostHitSegment.hint}</p>
      </ProfileBlock>

      <ProfileBlock className={styles.trendBlock} title="Scoring trend" iconSrc={barChartIcon}>
        <ScoringTrendChart points={profile.scoringTrend} />
      </ProfileBlock>
    </div>
  );
}
