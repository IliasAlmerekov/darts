import React from "react";
import barChartIcon from "@/assets/icons/bar-chart.svg";
import targetIcon from "@/assets/icons/target.svg";
import trophyIcon from "@/assets/icons/trophy.svg";
import type { PlayerProfile } from "@/lib/player/profile";
import { SAMPLE_PROFILE } from "../lib/sampleProfile";
import { HitDistribution } from "./HitDistribution";
import { ProfileBlock } from "./ProfileBlock";
import { RangeSelect } from "./RangeSelect";
import { ScoringTrendChart } from "./ScoringTrendChart";
import styles from "./OverviewTab.module.css";

interface OverviewTabProps {
  profile: PlayerProfile;
  displayName: string;
}

function LightbulbIcon(): React.JSX.Element {
  return (
    <svg
      className={styles.hintIcon}
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" />
    </svg>
  );
}

export function OverviewTab({ profile, displayName }: OverviewTabProps): React.JSX.Element {
  const { favoriteDoubles, highestFinish, mostHitSegment } = SAMPLE_PROFILE;

  return (
    <div className={styles.overview}>
      <ProfileBlock
        className={styles.hitDistributionBlock}
        title="Hit distribution"
        description={`See where ${displayName} hits the dartboard most often.`}
        action={<RangeSelect label="Games in the hit distribution" option="All games" />}
        isSample
      >
        <HitDistribution />
      </ProfileBlock>

      <div className={styles.firstRow}>
        <ProfileBlock title="Favorite doubles" iconSrc={targetIcon} isSample>
          <ol className={styles.doublesList}>
            {favoriteDoubles.map((double, index) => (
              <li key={double.segment} className={styles.doubleItem}>
                <span className={styles.rank}>{index + 1}</span>
                <span className={styles.doubleSegment}>{double.segment}</span>
                <span className={styles.doubleRate}>
                  <span className={styles.doublePercent}>
                    {Math.round((double.hits / double.attempts) * 100)}%
                  </span>
                  <span className={styles.doubleHits}>
                    {double.hits} / {double.attempts}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </ProfileBlock>

        <ProfileBlock title="Highest finish" iconSrc={trophyIcon} isSample>
          <div className={styles.centered}>
            <p className={styles.bigValue}>{highestFinish.score}</p>
            <p className={styles.caption}>in {highestFinish.darts} darts</p>
            <p className={styles.throws}>
              {highestFinish.throws.map((dart, index) => (
                <React.Fragment key={index}>
                  {index > 0 ? <span aria-hidden="true"> • </span> : null}
                  {dart}
                </React.Fragment>
              ))}
            </p>
          </div>
        </ProfileBlock>
      </div>

      <div className={styles.secondRow}>
        <ProfileBlock
          title="Scoring trend"
          iconSrc={barChartIcon}
          action={<RangeSelect label="Games in the scoring trend" option="Last 10 games" />}
        >
          <ScoringTrendChart points={profile.scoringTrend} />
        </ProfileBlock>

        <ProfileBlock title="Most hit segment" iconSrc={targetIcon} isSample>
          <div className={styles.centered}>
            <p className={styles.bigValue}>{mostHitSegment.segment}</p>
            <p className={styles.caption}>{mostHitSegment.share}% of all throws</p>
          </div>
          <p className={styles.hint}>
            <LightbulbIcon />
            You hit segment {mostHitSegment.segment} more than any other segment.
          </p>
        </ProfileBlock>
      </div>
    </div>
  );
}
