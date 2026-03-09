import { vi } from "vitest";
import { createBrowserRouterWithFuture, createMemoryRouterWithFuture } from "./routerFutureFlags";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();

  return {
    ...actual,
    BrowserRouter: createBrowserRouterWithFuture(actual.BrowserRouter),
    MemoryRouter: createMemoryRouterWithFuture(actual.MemoryRouter),
  };
});
