// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "./Pagination";

describe("Pagination", () => {
  it("renders previous and next controls", () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );

    expect(screen.getByRole("navigation", { name: "pagination" })).toBeDefined();
    expect(screen.getByLabelText("Go to previous page")).toBeDefined();
    expect(screen.getByLabelText("Go to next page")).toBeDefined();
  });

  it("respects disabled state", () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" disabled />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" disabled />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );

    expect(screen.getByLabelText("Go to previous page").getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByLabelText("Go to next page").getAttribute("aria-disabled")).toBe("true");
  });

  it("calls click handlers", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();

    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious onClick={onPrev} />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext onClick={onNext} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );

    fireEvent.click(screen.getByLabelText("Go to previous page"));
    fireEvent.click(screen.getByLabelText("Go to next page"));

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("renders ellipsis", () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );

    expect(screen.getByText("More pages")).toBeDefined();
  });
});
