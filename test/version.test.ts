import { describe, expect, it } from "vitest";

import { SERVER_NAME, SERVER_VERSION } from "../src/version.js";

describe("server identity", () => {
  it("has stable package metadata", () => {
    expect(SERVER_NAME).toBe("pattern-intelligence-mcp");
    expect(SERVER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
