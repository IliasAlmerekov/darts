import React from "react";
import clsx from "clsx";
import type { ScoringTrendPoint } from "@/lib/player/profile";
import styles from "./ScoringTrendChart.module.css";

interface ScoringTrendChartProps {
  points: ScoringTrendPoint[];
  isLarge?: boolean;
}

const WIDTH = 320;
const HEIGHT = 160;
const PADDING_LEFT = 36;
const PADDING_RIGHT = 12;
const PADDING_Y = 16;
// A flat line still gets some room above and below it.
const MIN_VALUE_SPAN = 10;

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Each game's round average, oldest on the left. */
export function ScoringTrendChart({
  points,
  isLarge = false,
}: ScoringTrendChartProps): React.JSX.Element {
  if (points.length === 0) {
    return <p className={styles.emptyChart}>No finished games yet.</p>;
  }

  const values = points.map((point) => point.roundAverage);
  const lowest = Math.min(...values);
  const highest = Math.max(...values);
  const padding = Math.max(0, MIN_VALUE_SPAN - (highest - lowest)) / 2;
  const minValue = lowest - padding;
  const maxValue = highest + padding;
  const plotWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = HEIGHT - PADDING_Y * 2;

  const coordinates = points.map((point, index) => ({
    point,
    x: round(
      PADDING_LEFT +
        (points.length === 1 ? plotWidth / 2 : (plotWidth * index) / (points.length - 1)),
    ),
    y: round(
      PADDING_Y + plotHeight * (1 - (point.roundAverage - minValue) / (maxValue - minValue)),
    ),
  }));

  return (
    <svg
      className={clsx(styles.chart, { [styles.largeChart ?? ""]: isLarge })}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Scoring trend chart"
    >
      <line
        className={styles.axis}
        x1={PADDING_LEFT}
        y1={HEIGHT - PADDING_Y}
        x2={WIDTH - PADDING_RIGHT}
        y2={HEIGHT - PADDING_Y}
      />
      <text className={styles.axisLabel} x={PADDING_LEFT - 6} y={PADDING_Y + 4}>
        {maxValue.toFixed(0)}
      </text>
      <text className={styles.axisLabel} x={PADDING_LEFT - 6} y={HEIGHT - PADDING_Y + 4}>
        {minValue.toFixed(0)}
      </text>
      <polyline
        className={styles.trendLine}
        points={coordinates.map(({ x, y }) => `${x},${y}`).join(" ")}
      />
      {coordinates.map(({ point, x, y }) => (
        <circle key={point.gameId} className={styles.trendPoint} cx={x} cy={y} r={4}>
          <title>{point.label}</title>
        </circle>
      ))}
    </svg>
  );
}
