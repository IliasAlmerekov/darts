import React from "react";
import barChartIcon from "@/assets/icons/bar-chart.svg";
import targetIcon from "@/assets/icons/target.svg";
import trophyIcon from "@/assets/icons/trophy.svg";
import type { PlayerProfile } from "@/lib/player/profile";
import type { BoardHitFrequencies } from "../lib/hitFrequency";
import { HitDistribution } from "./HitDistribution";
import { ProfileBlock } from "./ProfileBlock";
import { RangeSelect } from "./RangeSelect";
import { ScoringTrendChart } from "./ScoringTrendChart";
import styles from "./OverviewTab.module.css";

interface OverviewTabProps {
  profile: PlayerProfile;
  hitFrequencies: BoardHitFrequencies;
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

interface EmptyBlockProps {
  text: string;
}

/** The one line an Overview block shows while the player has no value for it. */
function EmptyBlock({ text }: EmptyBlockProps): React.JSX.Element {
  return (
    <div className={styles.centered}>
      <p className={styles.caption}>{text}</p>
    </div>
  );
}

export function OverviewTab({
  profile,
  hitFrequencies,
  displayName,
}: OverviewTabProps): React.JSX.Element {
  const { favoriteDoubles, highestFinish, mostHitSegment } = profile;

  return (
    <div className={styles.overview}>
      <ProfileBlock
        className={styles.hitDistributionBlock}
        title="Hit distribution"
        description={`See where ${displayName} hits the dartboard most often.`}
        action={<RangeSelect label="Games in the hit distribution" option="All games" />}
      >
        <HitDistribution hitFrequencies={hitFrequencies} mostHitSegment={mostHitSegment} />
      </ProfileBlock>

      <div className={styles.firstRow}>
        <ProfileBlock title="Favorite doubles" iconSrc={targetIcon}>
          {favoriteDoubles.length === 0 ? (
            <EmptyBlock text="No double-out checkouts yet" />
          ) : (
            <ol className={styles.doublesList}>
              {favoriteDoubles.map((double, index) => (
                <li key={double.double} className={styles.doubleItem}>
                  <span className={styles.rank}>{index + 1}</span>
                  <span className={styles.doubleSegment}>{double.double}</span>
                  <span className={styles.doubleRate}>
                    <span className={styles.doublePercent}>{double.hitRate}</span>
                    <span className={styles.doubleHits}>{double.checkouts}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </ProfileBlock>

        <ProfileBlock title="Highest finish" iconSrc={trophyIcon}>
          {highestFinish === null ? (
            <EmptyBlock text="No finish yet" />
          ) : (
            <div className={styles.centered}>
              <p className={styles.bigValue}>{highestFinish.score}</p>
              <p className={styles.caption}>{highestFinish.darts}</p>
              <p className={styles.throws}>
                {highestFinish.throws.map((dart, index) => (
                  <React.Fragment key={dart.key}>
                    {index > 0 ? <span aria-hidden="true"> • </span> : null}
                    {dart.label}
                  </React.Fragment>
                ))}
              </p>
            </div>
          )}
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

        <ProfileBlock title="Most hit segment" iconSrc={targetIcon}>
          {mostHitSegment === null ? (
            <EmptyBlock text="No hits yet" />
          ) : (
            <>
              <div className={styles.centered}>
                <p className={styles.bigValue}>{mostHitSegment.segment}</p>
                <p className={styles.caption}>{mostHitSegment.share} of all throws</p>
              </div>
              <p className={styles.hint}>
                <LightbulbIcon />
                You hit {mostHitSegment.name} more than any other segment.
              </p>
            </>
          )}
        </ProfileBlock>
      </div>
    </div>
  );
}
