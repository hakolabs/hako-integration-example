import { describe, expect, it, vi } from "vitest";
import { runStrategyListCommand } from "../src/commands/strategy-list.js";

describe("strategy:list command", () => {
  it("shows APY, TVL, input token symbols, and entrypoint networks", async () => {
    const api = {
      getStrategies: vi.fn().mockResolvedValue({
        data: [
          {
            strategyId: "stable_vault",
            name: "Stable Vault",
            description: "Example",
            inputTokens: [
              {
                symbol: "USDC",
                name: "USD Coin",
                decimals: 6,
                network: "base",
                address: "0x1111111111111111111111111111111111111111",
              },
              {
                symbol: "USDC",
                name: "USD Coin",
                decimals: 6,
                network: "arbitrum",
                address: "0x2222222222222222222222222222222222222222",
              },
              {
                symbol: "DAI",
                name: "Dai",
                decimals: 18,
                network: "ethereum",
                address: "0x3333333333333333333333333333333333333333",
              },
            ],
            outputTokens: [],
            entrypoints: [
              {
                actions: ["deposit", "withdraw"],
                network: "base",
                isHome: true,
                contractAddress: "0x1111111111111111111111111111111111111111",
              },
              {
                actions: ["deposit", "withdraw"],
                network: "arbitrum",
                isHome: false,
                contractAddress: "0x2222222222222222222222222222222222222222",
              },
            ],
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

    const result = await runStrategyListCommand({ api });

    expect(result.lines).toEqual([
      "Available strategies:",
      "- stable_vault: Stable Vault",
      "  APY: 8.27% | TVL: $38.51",
      "  Input tokens: USDC, DAI",
      "  Entrypoints: base (home), arbitrum",
      "Request ID: req-strategy",
    ]);
  });
});
