import { describe, expect, it } from "vitest";
import {
  loadApiConfig,
  loadConfig,
  loadOptionalPartnerKey,
  loadOptionalWalletConfig,
  loadPartnerConfig,
  loadWalletConfig,
  normalizeHakoApiBaseUrl,
} from "../src/lib/config.js";

describe("config", () => {
  it("normalizes a bare API origin to /v1", () => {
    expect(normalizeHakoApiBaseUrl("https://api.hako.test")).toBe(
      "https://api.hako.test/v1",
    );
  });

  it("keeps an existing /v1 path", () => {
    expect(normalizeHakoApiBaseUrl("https://api.hako.test/v1/")).toBe(
      "https://api.hako.test/v1",
    );
  });

  it("upgrades .app domains to https automatically", () => {
    expect(normalizeHakoApiBaseUrl("http://app.hakolabs.app/v1")).toBe(
      "https://app.hakolabs.app/v1",
    );
  });

  it("loads required config and optional RPC overrides", () => {
    const config = loadConfig({
      HAKO_API: "https://api.hako.test",
      PRIVATE_KEY: `0x${"11".repeat(32)}`,
      PARTNER_KEY: "partner-key",
      RPC_URL_BASE: "https://base.rpc.example",
    });

    expect(config.hakoApiBaseUrl).toBe("https://api.hako.test/v1");
    expect(config.partnerKey).toBe("partner-key");
    expect(config.rpcUrls.base).toBe("https://base.rpc.example/");
  });

  it("loads api-only config without partner or private key", () => {
    const config = loadApiConfig({
      HAKO_API: "https://app.hakolabs.app",
    });

    expect(config.rawHakoApiUrl).toBe("https://app.hakolabs.app");
    expect(config.hakoApiBaseUrl).toBe("https://app.hakolabs.app/v1");
  });

  it("loads optional partner and wallet config when omitted", () => {
    expect(loadOptionalPartnerKey({})).toBeUndefined();
    expect(loadOptionalWalletConfig({})).toBeNull();
  });

  it("loads partner and wallet configs when required", () => {
    const env = {
      PARTNER_KEY: "partner-key",
      PRIVATE_KEY: `0x${"22".repeat(32)}`,
      RPC_URL_BASE: "https://base.rpc.example",
    };

    expect(loadPartnerConfig(env).partnerKey).toBe("partner-key");
    expect(loadWalletConfig(env)).toMatchObject({
      privateKey: `0x${"22".repeat(32)}`,
      rpcUrls: {
        base: "https://base.rpc.example/",
      },
    });
  });
});
