// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createQueryClient } from "./queryClient";

describe("createQueryClient", () => {
  it("keeps the pre-TanStack read behaviour as defaults", () => {
    const options = createQueryClient().getDefaultOptions().queries;

    expect(options).toMatchObject({
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 0,
    });
  });
});
