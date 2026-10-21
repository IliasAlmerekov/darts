import React from "react";
import clsx from "clsx";
import type { ScoringTrendPoint } from "@/lib/player/profile";
import { ProfileMessage } from "./ProfileMessage";
import styles from "./ScoringTrendChart.module.css";

interface ScoringTrendChartProps {
  points: ScoringTrendPoint[];
  isLarge?: boolean;
}

const WIDTH = 360;
const HEIGHT = 190;
const PADDING_LEFT = 32;
const PADDING_RIGHT = 10;
const PADDING_TOP = 10;
const PADDING_BOTTOM = 44;
const TICK_COUNT = 4;
// Ticks step in tens, so a 56-point average gets the scale 0, 20, 40, 60, 80.
const TICK_UNIT = 10;

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

// The points' <title>s stay hidden inside role="img", so the label carries the trend itself.
function describeTrend(points: ScoringTrendPoint[]): string {
  const first = points[0]?.roundAverage.toFixed(1);
  const last = points[points.length - 1]?.roundAverage.toFixed(1);
  return points.length === 1
    ? `Scoring trend chart, 1 game, round average ${first}`
    : `Scoring trend chart, ${points.length} games, round average from ${first} to ${last}`;
}

/** Each game's round average, oldest on the left, on a scale from zero. */
export function ScoringTrendChart({
  points,
  isLarge = false,
}: ScoringTrendChartProps): React.JSX.Element {
  if (points.length === 0) {
    return <ProfileMessage>No finished games yet.</ProfileMessage>;
  }

  const highest = Math.max(...points.map((point) => point.roundAverage));
  const step = Math.max(TICK_UNIT, Math.ceil(highest / TICK_COUNT / TICK_UNIT) * TICK_UNIT);
  const maxValue = step * TICK_COUNT;
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, index) => index * step);
  const plotWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const baseline = PADDING_TOP + plotHeight;
  const toY = (value: number): number => round(PADDING_TOP + plotHeight * (1 - value / maxValue));

  const coordinates = points.map((point, index) => ({
    point,
    gameNumber: index + 1,
    x: round(
      PADDING_LEFT +
        (points.length === 1 ? plotWidth / 2 : (plotWidth * index) / (points.length - 1)),
    ),
    y: toY(point.roundAverage),
  }));
  const linePoints = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  const areaPoints =
    first && last ? `${first.x},${baseline} ${linePoints} ${last.x},${baseline}` : "";

  return (
    <svg
      className={clsx(styles.chart, { [styles.largeChart ?? ""]: isLarge })}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={describeTrend(points)}
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            className={styles.gridLine}
            x1={PADDING_LEFT}
            y1={toY(tick)}
            x2={WIDTH - PADDING_RIGHT}
            y2={toY(tick)}
          />
          <text className={styles.tickLabel} x={PADDING_LEFT - 8} y={toY(tick) + 3}>
            {tick}
          </text>
        </g>
      ))}
      {coordinates.map(({ point, gameNumber, x }) => (
        <g key={point.gameId}>
          <line className={styles.gridLine} x1={x} y1={PADDING_TOP} x2={x} y2={baseline} />
          <text className={styles.gameLabel} x={x} y={baseline + 16}>
            {gameNumber}
          </text>
        </g>
      ))}
      <text className={styles.axisTitle} x={PADDING_LEFT + plotWidth / 2} y={HEIGHT - 4}>
        Game number
      </text>
      <polygon className={styles.trendArea} points={areaPoints} />
      <polyline className={styles.trendLine} points={linePoints} />
      {coordinates.map(({ point, x, y }) => (
        <circle key={point.gameId} className={styles.trendPoint} cx={x} cy={y} r={3.5}>
          <title>{point.label}</title>
        </circle>
      ))}
    </svg>
  );
}
