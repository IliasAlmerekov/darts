import React, { useId } from "react";
import clsx from "clsx";
import type { PlayerProfile } from "@/lib/player/profile";
import {
  HIT_FREQUENCY_LABELS,
  toBoardHitFrequencies,
  type HitFrequency,
} from "../lib/hitFrequency";
import styles from "./HitDistribution.module.css";

// Clockwise from the top, as on a real board.
const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const SEGMENT_ANGLE = 360 / BOARD_ORDER.length;
// Ring radii in millimetres of a regulation board.
const BULL_RADIUS = 6.4;
const OUTER_BULL_RADIUS = 16;
const TREBLE_INNER = 99;
const TREBLE_OUTER = 107;
const DOUBLE_INNER = 162;
const DOUBLE_OUTER = 170;
const BOARD_RADIUS = 226;
const NUMBER_RADIUS = 198;
const FREQUENCIES: HitFrequency[] = [0, 1, 2, 3, 4];

const HEAT_CLASSES: Record<HitFrequency, string | undefined> = {
  0: styles.heatVeryHigh,
  1: styles.heatHigh,
  2: styles.heatMedium,
  3: styles.heatLow,
  4: styles.heatVeryLow,
};

const SPOT_RADII: Record<HitFrequency, number> = { 0: 34, 1: 26, 2: 20, 3: 14, 4: 0 };

function point(radius: number, degrees: number): [number, number] {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return [
    Math.round(radius * Math.cos(radians) * 10) / 10,
    Math.round(radius * Math.sin(radians) * 10) / 10,
  ];
}

function ringSlice(inner: number, outer: number, start: number, end: number): string {
  const [x1, y1] = point(inner, start);
  const [x2, y2] = point(outer, start);
  const [x3, y3] = point(outer, end);
  const [x4, y4] = point(inner, end);
  return `M ${x1} ${y1} L ${x2} ${y2} A ${outer} ${outer} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${inner} ${inner} 0 0 0 ${x1} ${y1} Z`;
}

const SEGMENTS = BOARD_ORDER.map((segment, index) => {
  const center = index * SEGMENT_ANGLE;
  const start = center - SEGMENT_ANGLE / 2;
  const end = center + SEGMENT_ANGLE / 2;
  const [labelX, labelY] = point(NUMBER_RADIUS, center);
  // Alternate the spot between the inner and outer single field, as real hits scatter.
  const [spotX, spotY] = point(index % 2 === 0 ? 135 : 62, center);
  return {
    segment,
    isDark: index % 2 === 0,
    singles: [
      ringSlice(OUTER_BULL_RADIUS, TREBLE_INNER, start, end),
      ringSlice(TREBLE_OUTER, DOUBLE_INNER, start, end),
    ],
    rings: [
      ringSlice(TREBLE_INNER, TREBLE_OUTER, start, end),
      ringSlice(DOUBLE_INNER, DOUBLE_OUTER, start, end),
    ],
    labelX,
    labelY,
    spotX,
    spotY,
  };
});

interface HitDistributionProps {
  hitDistribution: PlayerProfile["hitDistribution"];
  mostHitSegment: PlayerProfile["mostHitSegment"];
}

/** A dartboard with a heat spot where the player's darts land most. */
export function HitDistribution({
  hitDistribution,
  mostHitSegment,
}: HitDistributionProps): React.JSX.Element {
  const { segments, bull } = toBoardHitFrequencies(hitDistribution);
  const blurId = useId();

  return (
    <div className={styles.hitDistribution}>
      <svg
        className={styles.board}
        viewBox={`${-BOARD_RADIUS} ${-BOARD_RADIUS} ${BOARD_RADIUS * 2} ${BOARD_RADIUS * 2}`}
        role="img"
        aria-label={
          mostHitSegment === null
            ? "Dartboard heatmap"
            : `Dartboard heatmap, most hits on ${mostHitSegment.segment}`
        }
      >
        <defs>
          <filter id={blurId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        <circle className={styles.surround} r={BOARD_RADIUS} />
        {SEGMENTS.map(({ segment, isDark, singles, rings, labelX, labelY }) => (
          <g key={segment}>
            {singles.map((path) => (
              <path
                key={path}
                className={isDark ? styles.singleDark : styles.singleLight}
                d={path}
              />
            ))}
            {rings.map((path) => (
              <path key={path} className={isDark ? styles.ringRed : styles.ringGreen} d={path} />
            ))}
            <text className={styles.number} x={labelX} y={labelY}>
              {segment}
            </text>
          </g>
        ))}
        <circle className={styles.ringGreen} r={OUTER_BULL_RADIUS} />
        <circle className={styles.ringRed} r={BULL_RADIUS} />

        <g>
          {SEGMENTS.map(({ segment, spotX, spotY }) => {
            const frequency = segments[String(segment)] ?? 4;
            return SPOT_RADII[frequency] > 0 ? (
              <g key={segment} className={HEAT_CLASSES[frequency]}>
                <circle
                  className={styles.spotGlow}
                  cx={spotX}
                  cy={spotY}
                  r={SPOT_RADII[frequency]}
                  filter={`url(#${blurId})`}
                />
                <circle className={styles.spotDot} cx={spotX} cy={spotY} r={8} />
              </g>
            ) : null;
          })}
          {SPOT_RADII[bull] > 0 ? (
            <circle
              className={clsx(styles.spotGlow, HEAT_CLASSES[bull])}
              r={SPOT_RADII[bull]}
              filter={`url(#${blurId})`}
            />
          ) : null}
        </g>
      </svg>

      <div className={styles.legend}>
        <span className={styles.legendTitle}>Hit frequency</span>
        <ul className={styles.legendList}>
          {FREQUENCIES.map((frequency) => (
            <li key={frequency} className={styles.legendItem}>
              <span
                className={clsx(styles.legendSwatch, HEAT_CLASSES[frequency])}
                aria-hidden="true"
              />
              {HIT_FREQUENCY_LABELS[frequency]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
