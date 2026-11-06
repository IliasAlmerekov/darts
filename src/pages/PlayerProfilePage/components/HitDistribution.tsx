import React from "react";
import clsx from "clsx";
import type { PlayerProfile } from "@/lib/player/profile";
import {
  BOARD_ORDER,
  BULL_RADIUS,
  DOUBLE_INNER,
  DOUBLE_OUTER,
  OUTER_BULL_RADIUS,
  SEGMENT_ANGLE,
  TREBLE_INNER,
  TREBLE_OUTER,
} from "../lib/boardFieldSpot";
import type { HitDot } from "../lib/hitDots";
import {
  HIT_FREQUENCY_LABELS,
  type BoardHitFrequencies,
  type HitFrequency,
} from "../lib/hitFrequency";
import styles from "./HitDistribution.module.css";

const BOARD_RADIUS = 226;
// A hit's dot in board millimetres. Its centre stays inside the board field; the dot itself
// may reach past a thin ring, so overlapping hits stay readable as separate dots.
const DOT_RADIUS = 6;
const DOT_OUTLINE = 1.5;
const NUMBER_RADIUS = 198;
const FREQUENCIES: HitFrequency[] = [0, 1, 2, 3, 4];

const HEAT_CLASSES: Record<HitFrequency, string | undefined> = {
  0: styles.heatVeryHigh,
  1: styles.heatHigh,
  2: styles.heatMedium,
  3: styles.heatLow,
  4: styles.heatVeryLow,
};

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
  };
});

interface HitDistributionProps {
  hitFrequencies: BoardHitFrequencies;
  /** One dot per hit, or the board's share of 600 dots. */
  hitDots: HitDot[];
  mostHitSegment: PlayerProfile["mostHitSegment"];
}

/** A dartboard with a blue dot per hit; the dots pile up where the player's darts land most. */
export function HitDistribution({
  hitFrequencies,
  hitDots,
  mostHitSegment,
}: HitDistributionProps): React.JSX.Element {
  const { fields, bull } = hitFrequencies;

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

        <g aria-hidden="true">
          {hitDots.map(({ field, index, x, y }) => (
            <circle
              key={`${field}:${index}`}
              className={clsx(
                styles.hitDot,
                HEAT_CLASSES[
                  field === "BULL" || field === "BULLSEYE" ? bull : (fields[field] ?? 4)
                ],
              )}
              cx={x}
              cy={y}
              r={DOT_RADIUS}
              strokeWidth={DOT_OUTLINE}
            />
          ))}
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
