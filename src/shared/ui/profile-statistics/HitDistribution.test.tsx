// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BOARD_FIELDS, buildHitDistribution } from "@/shared/types/player.test-support";
import { BOARD_ORDER } from "./boardFieldSpot";
import type { HitDot } from "./hitDots";
import { HitDistribution } from "./HitDistribution";
import styles from "./HitDistribution.module.css";

const BOARD_LABEL = "Dartboard heatmap of all games";

function board(): HTMLElement {
  return screen.getByRole("group", { name: BOARD_LABEL });
}

/** The hit dots, in a group assistive technology skips. */
function hitDots(): Element[] {
  return Array.from(board().querySelectorAll('g[aria-hidden="true"] > circle'));
}

/** Identify fields from rendered coordinates, independently of the dot generator's order. */
function dotsInField(field: HitDot["field"]): Element[] {
  return hitDots().filter((dot) => {
    const x = Number(dot.getAttribute("cx"));
    const y = Number(dot.getAttribute("cy"));
    const radius = Math.hypot(x, y);
    if (field === "BULLSEYE") return radius < 6.4;
    if (field === "BULL") return radius >= 6.4 && radius < 16;
    const angle = ((Math.atan2(x, -y) * 180) / Math.PI + 369) % 360;
    const segment = BOARD_ORDER[Math.floor(angle / 18)];
    const ring = radius >= 162 && radius <= 170 ? "D" : radius >= 99 && radius <= 107 ? "T" : "S";
    return radius >= 16 && radius <= 170 && `${ring}${segment}` === field;
  });
}

/** The class of the blue layer over a hit board field, past 150 hits. */
function heatFieldClass(field: string): string | null {
  return board().querySelector(`[data-field="${field}"]`)?.getAttribute("class") ?? null;
}

describe("HitDistribution", () => {
  it("draws one hidden dot per hit in its board field's step", () => {
    const hits = { T20: 40, D16: 30, T19: 20, S5: 10, BULL: 12 };

    render(
      <HitDistribution hitDistribution={buildHitDistribution(hits)} boardLabel={BOARD_LABEL} />,
    );

    const dots = hitDots();
    expect(dots).toHaveLength(112);
    expect(dots.every((dot) => dot.getAttribute("r") === "6")).toBe(true);
    expect(dots.every((dot) => dot.getAttribute("stroke-width") === "1.5")).toBe(true);
    const expectedClasses: Partial<Record<HitDot["field"], string | undefined>> = {
      T20: styles.heatVeryHigh,
      D16: styles.heatHigh,
      T19: styles.heatMedium,
      S5: styles.heatLow,
      BULL: styles.heatLow,
    };
    for (const field of BOARD_FIELDS) {
      if (!(field in expectedClasses)) continue;
      const fieldDots = dotsInField(field);
      expect(fieldDots, field).toHaveLength(hits[field as keyof typeof hits]);
      for (const dot of fieldDots) {
        expect(dot.classList, field).toContain(expectedClasses[field]);
      }
    }
  });

  it("fills Bull and Bullseye each by its own hit frequency step past 150 hits", () => {
    render(
      <HitDistribution
        hitDistribution={buildHitDistribution({ BULL: 200, BULLSEYE: 1 })}
        boardLabel={BOARD_LABEL}
      />,
    );

    // Bull leads the board and is Very high; 1 Bullseye hit against 200 is Very low.
    expect(heatFieldClass("BULL")).toContain(styles.heatVeryHigh);
    expect(heatFieldClass("BULLSEYE")).toContain(styles.heatVeryLow);
  });
});
