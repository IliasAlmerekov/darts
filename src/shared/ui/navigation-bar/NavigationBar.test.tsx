// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import NavigationBar from "./NavigationBar";
import styles from "./NavigationBar.module.css";

describe("NavigationBar", () => {
  it("marks Statistics as active on details route", () => {
    render(
      <MemoryRouter initialEntries={["/details/551"]}>
        <NavigationBar />
      </MemoryRouter>,
    );

    const statisticsButton = screen.getByRole("button", { name: /Statistics/i });
    const gameButton = screen.getByRole("button", { name: /Game/i });
    const statisticsIcon = screen.getByAltText("Statistics") as HTMLImageElement;

    expect(statisticsButton.classList.contains(styles.active)).toBe(true);
    expect(gameButton.classList.contains(styles.inactive)).toBe(true);
    expect(statisticsIcon.src.includes("inactive")).toBe(false);
  });
});
