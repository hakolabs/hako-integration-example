import { describe, expect, it, vi } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { runWithdrawCommand } from "../src/commands/withdraw.js";
import { parseTypedDataJson } from "../src/lib/wallet.js";
import type { WithdrawActionResponse } from "../src/lib/hako-api.js";

const authorizationJson = JSON.stringify({
  domain: {
    name: "Hako Withdraw",
    version: "1",
    chainId: 8453,
    verifyingContract: "0x3333333333333333333333333333333333333333",
  },
  types: {
    EIP712Domain: [],
    WithdrawalAuthorization: [
      { name: "actionId", type: "string" },
      { name: "owner", type: "address" },
      { name: "receiver", type: "address" },
      { name: "dstChainId", type: "uint256" },
      { name: "tokenAddress", type: "address" },
      { name: "amountNormalized", type: "uint256" },
      { name: "maxShares", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  },
  primaryType: "WithdrawalAuthorization",
  message: {
    actionId: "22222222-2222-4222-8222-222222222222",
    owner: "0x1111111111111111111111111111111111111111",
    receiver: "0x2222222222222222222222222222222222222222",
    dstChainId: "8453",
    tokenAddress: "0x5555555555555555555555555555555555555555",
    amountNormalized: "1000000",
    maxShares: "1100000",
    nonce: "1",
    deadline: "9999999999",
  },
});

function buildWithdrawAction(
  overrides?: Partial<WithdrawActionResponse>,
): WithdrawActionResponse {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    externalId: "withdraw-1",
    type: "withdraw",
    status: "NEW",
    createdAt: "2026-03-06T10:00:00.000Z",
    address: "0x1111111111111111111111111111111111111111",
    receiver: "0x2222222222222222222222222222222222222222",
    token: "USDC",
    decimals: 6,
    network: "base",
    amount: 1,
    amountUsd: 1,
    amountRaw: "1000000",
    expiresAt: "2026-03-06T11:00:00.000Z",
    authorization: authorizationJson,
    ...overrides,
  };
}

describe("withdraw command", () => {
  it("parses typed-data JSON into a viem-friendly shape", () => {
    const typedData = parseTypedDataJson(authorizationJson);

    expect(typedData.primaryType).toBe("WithdrawalAuthorization");
    expect(typedData.domain.chainId).toBe(8453);
    expect(typedData.message.owner).toBe(
      "0x1111111111111111111111111111111111111111",
    );
    expect(typedData.message.nonce).toBe("1");
    expect(typedData.message.dstChainId).toBe("8453");
  });

  it("produces the same signature for string and bigint numeric fields", async () => {
    const account = privateKeyToAccount(
      "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    );
    const parsedTypedData = parseTypedDataJson(authorizationJson);
    const normalizedTypedData = {
      ...parsedTypedData,
      message: {
        ...parsedTypedData.message,
        dstChainId: 8453n,
        amountNormalized: 1000000n,
        maxShares: 1100000n,
        nonce: 1n,
        deadline: 9999999999n,
      },
    };

    const parsedSignature = await account.signTypedData(
      parsedTypedData as Parameters<typeof account.signTypedData>[0],
    );
    const normalizedSignature = await account.signTypedData(
      normalizedTypedData as Parameters<typeof account.signTypedData>[0],
    );

    expect(parsedSignature).toBe(normalizedSignature);
  });

  it("signs typed-data and authorizes the withdrawal action", async () => {
    const createWithdrawAction = vi.fn().mockResolvedValue({
      data: buildWithdrawAction(),
      requestId: "req-create",
    });
    const authorizeAction = vi.fn().mockResolvedValue({
      data: {
        status: "ok" as const,
        txHash:
          "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
      requestId: "req-authorize",
    });
    const signTypedDataPayload = vi.fn().mockResolvedValue({
      signature:
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      typedData: parseTypedDataJson(authorizationJson),
    });

    const result = await runWithdrawCommand(
      {
        chain: "base",
        token: "USDC",
        amount: "1",
      },
      {
        api: { createWithdrawAction, authorizeAction },
        wallet: {
          address: "0x1111111111111111111111111111111111111111",
          signTypedDataPayload,
        },
        createExternalId: () => "withdraw-1",
      },
    );

    expect(signTypedDataPayload).toHaveBeenCalledWith(authorizationJson);
    expect(authorizeAction).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    );
    expect(result.data.relayTxHash).toBe(
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    expect(result.data.receiver).toBe(
      "0x1111111111111111111111111111111111111111",
    );
  });
});
