import React, { useState } from "react";
import targetIcon from "@/assets/icons/target.svg";
import trophyIcon from "@/assets/icons/trophy.svg";
import clsx from "clsx";
import type { HitDistributionFilter, ProfileStatistics } from "@/lib/player/profile";
import { HitDistribution } from "./HitDistribution";
import { ProfileBlock } from "./ProfileBlock";
import { RangeSelect } from "./RangeSelect";
import styles from "./ProfileStatisticsOverview.module.css";

interface ProfileStatisticsOverviewProps {
  statistics: ProfileStatistics;
  displayName: string;
  /** True on the player's own profile, where the hints address the player as "You". */
  isOwnProfile: boolean;
  /** A block that needs the recent games, such as the scoring trend, beside Most hit segment. */
  trendBlock?: React.ReactNode;
}

const HIT_FILTER_OPTIONS: { value: HitDistributionFilter; label: string }[] = [
  { value: "all", label: "All games" },
  { value: "singleout", label: "Single-Out" },
  { value: "doubleout", label: "Double-Out" },
  { value: "tripleout", label: "Triple-Out" },
];

const BOARD_LABELS: Record<HitDistributionFilter, string> = {
  all: "Dartboard heatmap of all games",
  singleout: "Dartboard heatmap of Single-Out games",
  doubleout: "Dartboard heatmap of Double-Out games",
  tripleout: "Dartboard heatmap of Triple-Out games",
};

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

/** The hit distribution, favorite doubles, highest finish and most hit segment of a Profile. */
export function ProfileStatisticsOverview({
  statistics,
  displayName,
  isOwnProfile,
  trendBlock,
}: ProfileStatisticsOverviewProps): React.JSX.Element {
  const { favoriteDoubles, highestFinish, mostHitSegment } = statistics;
  const [hitFilter, setHitFilter] = useState<HitDistributionFilter>("all");

  return (
    <div className={styles.overview}>
      <ProfileBlock
        className={styles.hitDistributionBlock}
        title="Hit distribution"
        description={`See where ${displayName} hits the dartboard most often.`}
        action={
          <RangeSelect
            label="Games in the hit distribution"
            options={HIT_FILTER_OPTIONS}
            value={hitFilter}
            onSelect={setHitFilter}
          />
        }
      >
        <HitDistribution
          hitDistribution={statistics.hitDistributions[hitFilter]}
          boardLabel={BOARD_LABELS[hitFilter]}
        />
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

      <div className={clsx(styles.secondRow, { [styles.singleBlockRow ?? ""]: !trendBlock })}>
        {trendBlock}

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
                {isOwnProfile ? "You hit" : `${displayName} hits`} {mostHitSegment.name} more than
                any other segment.
              </p>
            </>
          )}
        </ProfileBlock>
      </div>
    </div>
  );
}
