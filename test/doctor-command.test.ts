import { describe, expect, it, vi } from "vitest";
import { runDoctorCommand } from "../src/commands/doctor.js";

describe("doctor command", () => {
  it("runs public-only checks when only HAKO_API is configured", async () => {
    const publicApi = {
      getHealth: vi.fn().mockResolvedValue({
        data: { status: "ok" },
        requestId: "req-health",
      }),
      getStrategies: vi.fn().mockResolvedValue({
        data: [
          {
            strategyId: "stable_vault",
            name: "Stable Vault",
            description: "Example",
            inputTokens: [],
            outputTokens: [],
            entrypoints: [],
            meta: {
              minDepositUsd: 0.001,
              maxDepositUsd: 10000000,
              performanceFeeBps: 0,
              managementFeeBps: 0,
            },
            statistics: {
              tvlUsd: 38.51,
              apy: 8.27,
              apy7d: 8.27,
              tokenPriceUsd: 1.04,
            },
          },
        ],
        requestId: "req-strategy",
      }),
    };

    const result = await runDoctorCommand({
      rawHakoApiUrl: "https://app.hakolabs.app",
      normalizedHakoApiBaseUrl: "https://app.hakolabs.app/v1",
      publicApi,
    });

    expect(result.lines).toContain("Hako Integration Example doctor");
    expect(result.lines).toContain(
      "- Authenticated API check: skipped (PARTNER_KEY is not set)",
    );
    expect(result.lines).toContain(
      "- Derived wallet address: skipped (PRIVATE_KEY is not set)",
    );
  });

  it("runs authenticated checks when PARTNER_KEY is available", async () => {
    const publicApi = {
      getHealth: vi.fn().mockResolvedValue({
        data: { status: "ok" },
        requestId: "req-health",
      }),
      getStrategies: vi.fn().mockResolvedValue({
        data: [],
        requestId: "req-strategy",
      }),
    };
    const authenticatedApi = {
      getPosition: vi.fn().mockResolvedValue({
        data: { items: [] },
        requestId: "req-position",
      }),
    };

    const result = await runDoctorCommand({
      rawHakoApiUrl: "http://app.hakolabs.app/v1",
      normalizedHakoApiBaseUrl: "https://app.hakolabs.app/v1",
      publicApi,
      authenticatedApi,
      authenticatedAddress: "0x1111111111111111111111111111111111111111",
      walletAddress: "0x1111111111111111111111111111111111111111",
    });

    expect(authenticatedApi.getPosition).toHaveBeenCalledWith(
      "0x1111111111111111111111111111111111111111",
    );
    expect(result.lines).toContain(
      "- Normalized API base URL: https://app.hakolabs.app/v1 (normalized)",
    );
    expect(result.lines).toContain(
      "- Authenticated API check: ok for 0x1111111111111111111111111111111111111111 (0 position items) (request req-position)",
    );
    expect(result.lines).toContain(
      "- Derived wallet address: 0x1111111111111111111111111111111111111111",
    );
  });
});
