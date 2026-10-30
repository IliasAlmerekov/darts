// @vitest-environment node
import { describe, expect, it } from "vitest";

import * as endpoints from "./endpoints";
import * as sharedApi from "./index";

describe("@/shared/api barrel", () => {
  it("keeps endpoints.ts internal", () => {
    expect(Object.keys(endpoints)).toContain("createInviteEndpoint");
    for (const name of Object.keys(endpoints)) {
      expect(sharedApi).not.toHaveProperty(name);
    }
  });
});
