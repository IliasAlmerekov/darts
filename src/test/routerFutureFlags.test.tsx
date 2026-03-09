import type { BrowserRouterProps, MemoryRouterProps } from "react-router-dom";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  createBrowserRouterWithFuture,
  createMemoryRouterWithFuture,
  ROUTER_FUTURE_FLAGS,
} from "./routerFutureFlags";

describe("routerFutureFlags", () => {
  it("injects React Router future flags into BrowserRouter by default", () => {
    const browserRouterSpy = vi.fn((props: BrowserRouterProps) => <div>{props.children}</div>);
    const BrowserRouterWithFuture = createBrowserRouterWithFuture(browserRouterSpy);

    render(
      <BrowserRouterWithFuture basename="/app">
        <div>content</div>
      </BrowserRouterWithFuture>,
    );

    expect(browserRouterSpy).toHaveBeenCalledTimes(1);
    expect(browserRouterSpy.mock.calls[0]?.[0]).toMatchObject({
      basename: "/app",
      future: ROUTER_FUTURE_FLAGS,
    });
  });

  it("merges caller-provided future flags into MemoryRouter", () => {
    const memoryRouterSpy = vi.fn((props: MemoryRouterProps) => <div>{props.children}</div>);
    const MemoryRouterWithFuture = createMemoryRouterWithFuture(memoryRouterSpy);

    render(
      <MemoryRouterWithFuture
        future={{ v7_relativeSplatPath: false }}
        initialEntries={["/statistics"]}
      >
        <div>content</div>
      </MemoryRouterWithFuture>,
    );

    expect(memoryRouterSpy).toHaveBeenCalledTimes(1);
    expect(memoryRouterSpy.mock.calls[0]?.[0]).toMatchObject({
      initialEntries: ["/statistics"],
      future: {
        ...ROUTER_FUTURE_FLAGS,
        v7_relativeSplatPath: false,
      },
    });
  });
});
