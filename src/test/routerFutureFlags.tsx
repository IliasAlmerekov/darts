import type { ComponentType } from "react";
import type { BrowserRouterProps, MemoryRouterProps } from "react-router-dom";

export const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

export function createBrowserRouterWithFuture(
  RouterComponent: ComponentType<BrowserRouterProps>,
): ComponentType<BrowserRouterProps> {
  return function BrowserRouterWithFuture({ future, ...props }: BrowserRouterProps): JSX.Element {
    return <RouterComponent {...props} future={{ ...ROUTER_FUTURE_FLAGS, ...future }} />;
  };
}

export function createMemoryRouterWithFuture(
  RouterComponent: ComponentType<MemoryRouterProps>,
): ComponentType<MemoryRouterProps> {
  return function MemoryRouterWithFuture({ future, ...props }: MemoryRouterProps): JSX.Element {
    return <RouterComponent {...props} future={{ ...ROUTER_FUTURE_FLAGS, ...future }} />;
  };
}
