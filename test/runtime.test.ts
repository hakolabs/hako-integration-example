import { describe, expect, it } from "vitest";
import { PUBLIC_CHECK_ADDRESS } from "../src/lib/config.js";
import {
  createOptionalWalletRuntime,
  createPartnerApiRuntime,
  createPublicApiRuntime,
  getDoctorCheckAddress,
  normalizeEvmAddress,
  resolveAddressOrThrow,
} from "../src/lib/runtime.js";

describe("runtime", () => {
  it("creates a public runtime without PRIVATE_KEY or PARTNER_KEY", () => {
    const runtime = createPublicApiRuntime({
      HAKO_API: "https://api.hakolabs.app",
    });

    expect(runtime.apiConfig.hakoApiBaseUrl).toBe(
      "https://api.hakolabs.app/v1",
    );
    expect(runtime.partnerKey).toBeUndefined();
  });

  it("creates a partner runtime without PRIVATE_KEY", () => {
    const runtime = createPartnerApiRuntime({
      HAKO_API: "https://api.hakolabs.app",
      PARTNER_KEY: "partner-key",
    });

    expect(runtime.partnerKey).toBe("partner-key");
  });

  it("creates no wallet when PRIVATE_KEY is omitted", () => {
    const runtime = createOptionalWalletRuntime({});
    expect(runtime.wallet).toBeNull();
  });

  it("resolves command addresses from --address without a wallet", () => {
    expect(
      resolveAddressOrThrow({
        commandName: "position",
        address: "0x1111111111111111111111111111111111111111",
        wallet: null,
      }),
    ).toBe("0x1111111111111111111111111111111111111111");
  });

  it("throws when --address and PRIVATE_KEY are both missing", () => {
    expect(() =>
      resolveAddressOrThrow({
        commandName: "quote:deposit",
        wallet: null,
      }),
    ).toThrow("quote:deposit requires --address or PRIVATE_KEY");
  });

  it("uses the public check address when no wallet exists", () => {
    expect(getDoctorCheckAddress(null)).toBe(
      normalizeEvmAddress(PUBLIC_CHECK_ADDRESS),
    );
  });
});
