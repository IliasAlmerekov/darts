import type { BrowserRouterProps, MemoryRouterProps } from "react-router-dom";
import { vi } from "vitest";

const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();

  function BrowserRouterWithFuture({ future, ...props }: BrowserRouterProps): JSX.Element {
    return <actual.BrowserRouter {...props} future={{ ...ROUTER_FUTURE_FLAGS, ...future }} />;
  }

  function MemoryRouterWithFuture({ future, ...props }: MemoryRouterProps): JSX.Element {
    return <actual.MemoryRouter {...props} future={{ ...ROUTER_FUTURE_FLAGS, ...future }} />;
  }

  return {
    ...actual,
    BrowserRouter: BrowserRouterWithFuture,
    MemoryRouter: MemoryRouterWithFuture,
  };
});
