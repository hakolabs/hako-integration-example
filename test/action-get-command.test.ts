import { describe, expect, it, vi } from "vitest";
import { runActionGetCommand } from "../src/commands/action-get.js";

describe("action:get command", () => {
  it("shows deposit-specific execution and approval details", async () => {
    const api = {
      getAction: vi.fn().mockResolvedValue({
        data: {
          id: "11111111-1111-4111-8111-111111111111",
          externalId: "deposit-1",
          type: "deposit",
          status: "NEW",
          createdAt: "2026-03-07T10:00:00.000Z",
          address: "0x1111111111111111111111111111111111111111",
          decimals: 6,
          network: "base",
          amount: 1,
          amountUsd: 1,
          amountRaw: "1000000",
          approvalTx: {
            network: "base",
            token: "USDC",
            amountRaw: "1000000",
            spenderAddress: "0x2222222222222222222222222222222222222222",
            tx: {
              to: "0x3333333333333333333333333333333333333333",
              data: "0xabcdef",
              value: "0",
            },
          },
          transaction: {
            network: "base",
            tx: {
              to: "0x4444444444444444444444444444444444444444",
              data: "0x123456",
              value: "0",
            },
          },
        },
        requestId: "req-action",
      }),
    };

    const result = await runActionGetCommand(
      { actionId: "11111111-1111-4111-8111-111111111111" },
      { api },
    );

    expect(result.lines).toContain("- Execution tx network: base");
    expect(result.lines).toContain("- Approval required: yes");
    expect(result.lines).toContain("- Approval network: base");
  });
});
