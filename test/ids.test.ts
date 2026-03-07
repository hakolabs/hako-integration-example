import { describe, expect, it } from "vitest";
import { generateExternalId } from "../src/lib/ids.js";

describe("generateExternalId", () => {
  it("builds a timestamped id for deposits", () => {
    const externalId = generateExternalId("deposit");
    expect(externalId).toMatch(/^showcase-deposit-\d{14}-[a-f0-9-]+$/);
  });
});
