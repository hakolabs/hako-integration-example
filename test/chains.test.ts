import { describe, expect, it } from "vitest";
import {
  getChainConfig,
  normalizeChainName,
  resolveRpcUrl,
} from "../src/lib/chains.js";

describe("chains", () => {
  it("normalizes supported chain names", () => {
    expect(normalizeChainName("BASE")).toBe("base");
    expect(normalizeChainName("ethereum")).toBe("ethereum");
  });

  it("prefers RPC env overrides over default chain RPC URLs", () => {
    expect(
      resolveRpcUrl("base", {
        base: "https://override.base.example",
      }),
    ).toBe("https://override.base.example");
  });

  it("falls back to the default viem RPC URL when no override is present", () => {
    expect(resolveRpcUrl("base", {})).toBe(
      getChainConfig("base").chain.rpcUrls.default.http[0],
    );
  });
});
