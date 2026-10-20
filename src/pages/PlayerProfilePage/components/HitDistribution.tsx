import React from "react";
import clsx from "clsx";
import { HIT_FREQUENCY_LABELS, SAMPLE_PROFILE, type HitFrequency } from "../lib/sampleProfile";
import styles from "./HitDistribution.module.css";

// Clockwise from the top, as on a real board.
const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const SEGMENT_ANGLE = 360 / BOARD_ORDER.length;
const OUTER_RADIUS = 90;
const INNER_RADIUS = 16;
const LABEL_RADIUS = 101;
const FREQUENCIES: HitFrequency[] = [0, 1, 2, 3, 4];

const HEAT_CLASSES: Record<HitFrequency, string | undefined> = {
  0: styles.heatVeryHigh,
  1: styles.heatHigh,
  2: styles.heatMedium,
  3: styles.heatLow,
  4: styles.heatVeryLow,
};

function polar(radius: number, degrees: number): string {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return `${(radius * Math.cos(radians)).toFixed(1)} ${(radius * Math.sin(radians)).toFixed(1)}`;
}

const SEGMENTS = BOARD_ORDER.map((segment, index) => {
  const start = index * SEGMENT_ANGLE - SEGMENT_ANGLE / 2;
  const end = start + SEGMENT_ANGLE;
  const labelRadians = ((index * SEGMENT_ANGLE - 90) * Math.PI) / 180;
  return {
    segment,
    path: [
      `M ${polar(INNER_RADIUS, start)}`,
      `L ${polar(OUTER_RADIUS, start)}`,
      `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 0 1 ${polar(OUTER_RADIUS, end)}`,
      `L ${polar(INNER_RADIUS, end)}`,
      `A ${INNER_RADIUS} ${INNER_RADIUS} 0 0 0 ${polar(INNER_RADIUS, start)}`,
      "Z",
    ].join(" "),
    labelX: (LABEL_RADIUS * Math.cos(labelRadians)).toFixed(1),
    labelY: (LABEL_RADIUS * Math.sin(labelRadians)).toFixed(1),
  };
});

/** A dartboard heatmap of where the player's darts land. */
export function HitDistribution(): React.JSX.Element {
  const { segments, bull } = SAMPLE_PROFILE.hitDistribution;

  return (
    <div className={styles.hitDistribution}>
      <svg
        className={styles.board}
        viewBox="-112 -112 224 224"
        role="img"
        aria-label={`Dartboard heatmap, most hits on ${SAMPLE_PROFILE.mostHitSegment.segment}`}
      >
        {SEGMENTS.map(({ segment, path, labelX, labelY }) => (
          <g key={segment}>
            <path className={clsx(styles.segment, HEAT_CLASSES[segments[segment] ?? 4])} d={path} />
            <text className={styles.segmentLabel} x={labelX} y={labelY}>
              {segment}
            </text>
          </g>
        ))}
        <circle className={clsx(styles.segment, HEAT_CLASSES[bull])} r={INNER_RADIUS - 2} />
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
