import React, { Fragment, useId, useMemo, useRef } from "react";
import clsx from "clsx";
import { Popover } from "@fujiui/react";
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
import { drawsHitDots, sectorHits, topHitFields, type BoardSector } from "../lib/hitFields";
import { toHitDots } from "../lib/hitDots";
import {
  toBoardHitFrequencies,
  type BoardField,
  type HitDistribution as Hits,
  type HitFrequency,
} from "../lib/hitFrequency";
import styles from "./HitDistribution.module.css";

const BOARD_RADIUS = 226;
// A hit's dot in board millimetres. Its centre stays inside the board field; the dot itself
// may reach past a thin ring, so overlapping hits stay readable as separate dots.
const DOT_RADIUS = 6;
const DOT_OUTLINE = 1.5;
const NUMBER_RADIUS = 198;

const HEAT_CLASSES: Record<HitFrequency, string | undefined> = {
  0: styles.heatVeryHigh,
  1: styles.heatHigh,
  2: styles.heatMedium,
  3: styles.heatLow,
  4: styles.heatVeryLow,
};

interface BoardFieldShape {
  field: BoardField;
  path: string;
  /** The board's own colour: dark or light for a single, red or green for a ring. */
  className: string | undefined;
}

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

/** A full circle as a path; two of them with `fill-rule: evenodd` make a ring. */
function circlePath(radius: number): string {
  return `M ${radius} 0 A ${radius} ${radius} 0 1 1 ${-radius} 0 A ${radius} ${radius} 0 1 1 ${radius} 0 Z`;
}

const SEGMENTS = BOARD_ORDER.map((segment, index) => {
  const center = index * SEGMENT_ANGLE;
  const start = center - SEGMENT_ANGLE / 2;
  const end = center + SEGMENT_ANGLE / 2;
  const [labelX, labelY] = point(NUMBER_RADIUS, center);
  const single = index % 2 === 0 ? styles.singleDark : styles.singleLight;
  const ring = index % 2 === 0 ? styles.ringRed : styles.ringGreen;
  const fields: BoardFieldShape[] = [
    {
      field: `S${segment}`,
      path: ringSlice(OUTER_BULL_RADIUS, TREBLE_INNER, start, end),
      className: single,
    },
    {
      field: `S${segment}`,
      path: ringSlice(TREBLE_OUTER, DOUBLE_INNER, start, end),
      className: single,
    },
    {
      field: `T${segment}`,
      path: ringSlice(TREBLE_INNER, TREBLE_OUTER, start, end),
      className: ring,
    },
    {
      field: `D${segment}`,
      path: ringSlice(DOUBLE_INNER, DOUBLE_OUTER, start, end),
      className: ring,
    },
  ];
  return { segment, fields, labelX, labelY };
});

const CENTRE_FIELDS: BoardFieldShape[] = [
  {
    field: "BULL",
    path: `${circlePath(OUTER_BULL_RADIUS)} ${circlePath(BULL_RADIUS)}`,
    className: styles.ringGreen,
  },
  { field: "BULLSEYE", path: circlePath(BULL_RADIUS), className: styles.ringRed },
];

function hitsText(hits: number): string {
  return `${hits} ${hits === 1 ? "hit" : "hits"}`;
}

interface HitDistributionProps {
  /** The hits of the games the filter selects. */
  hitDistribution: Hits;
  boardLabel: string;
}

/**
 * A dartboard of the player's hits: a blue dot per hit up to 150 hits, past that each board
 * field filled as strong as its hit frequency. Each sector opens a card with its hits.
 */
export function HitDistribution({
  hitDistribution,
  boardLabel,
}: HitDistributionProps): React.JSX.Element {
  const topFieldsId = useId();
  // Base UI returns focus only to an HTML trigger, and a sector is an SVG group, so Escape
  // would drop focus to the page. The sector that opened the card takes it back instead.
  const openerRef = useRef<Element | undefined>(undefined);
  const closedByEscapeRef = useRef(false);
  const showsDots = drawsHitDots(hitDistribution);
  // Up to 150 dots, so they are worked out once per hit distribution, not on every render.
  const hitDots = useMemo(
    () => (showsDots ? toHitDots(hitDistribution) : []),
    [showsDots, hitDistribution],
  );
  const frequencies = useMemo(() => toBoardHitFrequencies(hitDistribution), [hitDistribution]);
  const { hitsByField, topFields } = useMemo(
    () => ({
      hitsByField: new Map(hitDistribution.map(({ field, hits }) => [field, hits])),
      topFields: topHitFields(hitDistribution),
    }),
    [hitDistribution],
  );
  const leaderHits = topFields[0]?.hits ?? 0;

  const frequencyOf = (field: BoardField): HitFrequency => frequencies[field] ?? 4;

  const renderField = ({ field, path, className }: BoardFieldShape): React.JSX.Element => {
    if (showsDots) {
      return <path key={path} className={className} d={path} fillRule="evenodd" />;
    }
    // Past the dot limit the board keeps its colours, faded, and each hit board field gets a
    // blue layer on top, so the board still reads as a dartboard.
    const isHit = (hitsByField.get(field) ?? 0) > 0;
    return (
      <Fragment key={path}>
        <path className={clsx(className, styles.fadedField)} d={path} fillRule="evenodd" />
        {isHit ? (
          <path
            className={clsx(styles.heatField, HEAT_CLASSES[frequencyOf(field)])}
            d={path}
            fillRule="evenodd"
            data-field={field}
          />
        ) : null}
      </Fragment>
    );
  };

  return (
    <div className={styles.hitDistribution}>
      <Popover<BoardSector>
        onOpenChange={(open, { reason, trigger }) => {
          if (open) {
            openerRef.current = trigger;
          }
          closedByEscapeRef.current = !open && reason === "escape-key";
        }}
        onOpenChangeComplete={(open) => {
          const opener = openerRef.current;
          if (!open && closedByEscapeRef.current && opener instanceof SVGElement) {
            opener.focus();
          }
        }}
      >
        {({ payload }) => {
          const card = payload === undefined ? null : sectorHits(hitDistribution, payload);
          return (
            <>
              <svg
                className={styles.board}
                viewBox={`${-BOARD_RADIUS} ${-BOARD_RADIUS} ${BOARD_RADIUS * 2} ${BOARD_RADIUS * 2}`}
                role="group"
                aria-label={boardLabel}
              >
                <circle className={styles.surround} r={BOARD_RADIUS} />
                {SEGMENTS.map(({ segment, fields, labelX, labelY }) => (
                  <Popover.Trigger
                    key={segment}
                    className={styles.sector}
                    payload={segment}
                    nativeButton={false}
                    render={<g />}
                    aria-label={`Sector ${segment}`}
                  >
                    {fields.map(renderField)}
                    <text className={styles.number} x={labelX} y={labelY}>
                      {segment}
                    </text>
                  </Popover.Trigger>
                ))}
                <Popover.Trigger
                  className={styles.sector}
                  payload="BULL"
                  nativeButton={false}
                  render={<g />}
                  aria-label="Bull"
                >
                  {CENTRE_FIELDS.map(renderField)}
                </Popover.Trigger>

                <g className={styles.hitDots} aria-hidden="true">
                  {hitDots.map(({ field, index, x, y }) => (
                    <circle
                      key={`${field}:${index}`}
                      className={clsx(styles.hitDot, HEAT_CLASSES[frequencyOf(field)])}
                      cx={x}
                      cy={y}
                      r={DOT_RADIUS}
                      strokeWidth={DOT_OUTLINE}
                    />
                  ))}
                </g>
              </svg>

              <Popover.Content className={styles.sectorCard} side="right">
                {card === null ? null : (
                  <>
                    <Popover.Title className={styles.sectorTitle}>{card.name}</Popover.Title>
                    <p className={styles.sectorTotal}>{hitsText(card.hits)}</p>
                    <ul className={styles.sectorRows}>
                      {card.rows.map(({ label, hits }) => (
                        <li key={label} className={styles.sectorRow}>
                          {label}: <span className={styles.sectorHits}>{hits}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Popover.Content>
            </>
          );
        }}
      </Popover>

      <section className={styles.topFields} aria-labelledby={topFieldsId}>
        <h4 className={styles.topFieldsTitle} id={topFieldsId}>
          Most hit fields
        </h4>
        {topFields.length === 0 ? (
          <p className={styles.noHits}>No hits yet</p>
        ) : (
          <ol className={styles.topFieldsList}>
            {topFields.map(({ field, label, hits }) => (
              <li key={field} className={styles.topField}>
                <span className={styles.topFieldLabel}>{label}</span>
                <span className={styles.topFieldHits}>{hitsText(hits)}</span>
                <span className={styles.topFieldTrack} aria-hidden="true">
                  <span
                    className={styles.topFieldBar}
                    style={{ width: `${Math.round((hits / leaderHits) * 10000) / 100}%` }}
                  />
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
