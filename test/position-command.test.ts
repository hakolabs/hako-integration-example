import { describe, expect, it, vi } from "vitest";
import { runPositionCommand } from "../src/commands/position.js";

describe("position command", () => {
  it("shows pending action ids and kinds in human output", async () => {
    const api = {
      getPosition: vi.fn().mockResolvedValue({
        data: {
          items: [
            {
              evmAddress: "0x1111111111111111111111111111111111111111",
              strategyId: "stable_vault",
              amount: 10.23,
              amountRaw: "10230000000000000000",
              amountUsd: 10.25,
              token: {
                symbol: "hSTBL",
                decimals: 18,
              },
              apy: 8.27,
              pendingActions: [
                {
                  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                  kind: "deposit",
                  network: "base",
                  token: "USDC",
                  decimals: 6,
                  amount: 1,
                  amountUsd: 1,
                  amountAtomic: "1000000",
                },
              ],
            },
          ],
        },
        requestId: "req-position",
      }),
    };

    const result = await runPositionCommand(
      {},
      {
        api,
        walletAddress: "0x1111111111111111111111111111111111111111",
      },
    );

    expect(result.lines).toEqual([
      "Positions for 0x1111111111111111111111111111111111111111:",
      "- stable_vault: 10.23 hSTBL ($10.25)",
      "  APY: 8.27%",
      "  Pending actions:",
      "  - deposit aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa on base (1 USDC)",
      "Request ID: req-position",
    ]);
  });
});
