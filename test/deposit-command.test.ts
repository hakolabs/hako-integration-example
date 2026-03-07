import { describe, expect, it, vi } from "vitest";
import { runDepositCommand } from "../src/commands/deposit.js";
import type { DepositActionResponse } from "../src/lib/hako-api.js";

function buildDepositAction(overrides?: Partial<DepositActionResponse>): DepositActionResponse {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    externalId: "external-id",
    type: "deposit",
    status: "NEW",
    createdAt: "2026-03-06T10:00:00.000Z",
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
    ...overrides,
  };
}

describe("deposit command", () => {
  it("sends approval first when the API returns approvalTx", async () => {
    const createDepositAction = vi.fn().mockResolvedValue({
      data: buildDepositAction(),
      requestId: "req-create",
    });
    const reportAction = vi.fn().mockResolvedValue({
      data: { status: "ok" as const },
      requestId: "req-report",
    });
    const sendPreparedTransaction = vi
      .fn()
      .mockResolvedValueOnce(
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      )
      .mockResolvedValueOnce(
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      );

    const result = await runDepositCommand(
      {
        chain: "base",
        token: "USDC",
        amount: "1",
      },
      {
        api: { createDepositAction, reportAction },
        wallet: {
          address: "0x1111111111111111111111111111111111111111",
          sendPreparedTransaction,
        },
        createExternalId: () => "deposit-1",
      },
    );

    expect(createDepositAction).toHaveBeenCalledWith({
      strategyId: "stable_vault",
      externalId: "deposit-1",
      address: "0x1111111111111111111111111111111111111111",
      network: "base",
      amount: "1",
      token: "USDC",
    });
    expect(sendPreparedTransaction).toHaveBeenNthCalledWith(1, {
      network: "base",
      tx: buildDepositAction().approvalTx?.tx,
    });
    expect(sendPreparedTransaction).toHaveBeenNthCalledWith(2, {
      network: "base",
      tx: buildDepositAction().transaction.tx,
    });
    expect(reportAction).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "base",
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    );
    expect(result.data.approvalTxHash).toBe(
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    expect(result.data.depositTxHash).toBe(
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    );
  });

  it("skips approval when approvalTx is absent", async () => {
    const createDepositAction = vi.fn().mockResolvedValue({
      data: buildDepositAction({ approvalTx: null }),
      requestId: "req-create",
    });
    const reportAction = vi.fn().mockResolvedValue({
      data: { status: "ok" as const },
      requestId: "req-report",
    });
    const sendPreparedTransaction = vi.fn().mockResolvedValue(
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    );

    const result = await runDepositCommand(
      {
        chain: "base",
        token: "USDC",
        amount: "1",
      },
      {
        api: { createDepositAction, reportAction },
        wallet: {
          address: "0x1111111111111111111111111111111111111111",
          sendPreparedTransaction,
        },
        createExternalId: () => "deposit-2",
      },
    );

    expect(sendPreparedTransaction).toHaveBeenCalledTimes(1);
    expect(reportAction).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "base",
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    );
    expect(result.data.approvalTxHash).toBeNull();
  });
});
