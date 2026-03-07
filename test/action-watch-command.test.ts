import { describe, expect, it, vi } from "vitest";
import { runActionWatchCommand } from "../src/commands/action-watch.js";
import type { ActionResponse } from "../src/lib/hako-api.js";
import { PollingTimeoutError } from "../src/lib/polling.js";

function buildAction(status: ActionResponse["status"]): ActionResponse {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    externalId: "external-id",
    type: "deposit",
    status,
    createdAt: "2026-03-06T10:00:00.000Z",
    address: "0x1111111111111111111111111111111111111111",
    decimals: 6,
    network: "base",
    amount: 1,
    amountUsd: 1,
    amountRaw: "1000000",
    approvalTx: null,
    transaction: {
      network: "base",
      tx: {
        to: "0x3333333333333333333333333333333333333333",
        data: "0x1234",
        value: "0",
      },
    },
  };
}

function buildPoller(sequence: ActionResponse[]) {
  return async function pollUntilImpl(params: {
    readonly task: () => Promise<{ data: ActionResponse; requestId: string | null }>;
    readonly isDone: (value: { data: ActionResponse; requestId: string | null }) => boolean;
  }) {
    for (const _item of sequence) {
      const value = await params.task();
      if (params.isDone(value)) {
        return value;
      }
    }

    throw new PollingTimeoutError(100);
  };
}

describe("action:watch command", () => {
  it("polls until the action reaches COMPLETED", async () => {
    const responses = [
      { data: buildAction("NEW"), requestId: "req-1" },
      { data: buildAction("PROCESSING"), requestId: "req-2" },
      { data: buildAction("COMPLETED"), requestId: "req-3" },
    ];
    const getAction = vi.fn().mockImplementation(async () => responses.shift());
    let tick = 0;

    const result = await runActionWatchCommand(
      {
        actionId: "11111111-1111-4111-8111-111111111111",
        intervalMs: 0,
        timeoutMs: 100,
      },
      {
        api: { getAction },
        pollUntilImpl: buildPoller([
          buildAction("NEW"),
          buildAction("PROCESSING"),
          buildAction("COMPLETED"),
        ]),
        now: () => new Date(`2026-03-06T10:00:0${tick++}.000Z`),
      },
    );

    expect(result.data.action.status).toBe("COMPLETED");
    expect(result.data.history.map((item) => item.status)).toEqual([
      "NEW",
      "PROCESSING",
      "COMPLETED",
    ]);
  });

  it("returns terminal FAILED status", async () => {
    const responses = [
      { data: buildAction("NEW"), requestId: "req-1" },
      { data: buildAction("FAILED"), requestId: "req-2" },
    ];
    const getAction = vi.fn().mockImplementation(async () => responses.shift());

    const result = await runActionWatchCommand(
      {
        actionId: "11111111-1111-4111-8111-111111111111",
        intervalMs: 0,
        timeoutMs: 100,
      },
      {
        api: { getAction },
        pollUntilImpl: buildPoller([buildAction("NEW"), buildAction("FAILED")]),
      },
    );

    expect(result.data.action.status).toBe("FAILED");
  });

  it("keeps polling through PAYOUT_COMPLETED", async () => {
    const responses = [
      { data: buildAction("NEW"), requestId: "req-1" },
      { data: buildAction("PAYOUT_COMPLETED"), requestId: "req-2" },
      { data: buildAction("COMPLETED"), requestId: "req-3" },
    ];
    const getAction = vi.fn().mockImplementation(async () => responses.shift());

    const result = await runActionWatchCommand(
      {
        actionId: "11111111-1111-4111-8111-111111111111",
        intervalMs: 0,
        timeoutMs: 100,
      },
      {
        api: { getAction },
        pollUntilImpl: buildPoller([
          buildAction("NEW"),
          buildAction("PAYOUT_COMPLETED"),
          buildAction("COMPLETED"),
        ]),
      },
    );

    expect(result.data.history.map((item) => item.status)).toEqual([
      "NEW",
      "PAYOUT_COMPLETED",
      "COMPLETED",
    ]);
  });

  it("propagates polling timeout errors", async () => {
    const getAction = vi.fn().mockResolvedValue({
      data: buildAction("PROCESSING"),
      requestId: "req-timeout",
    });

    await expect(
      runActionWatchCommand(
        {
          actionId: "11111111-1111-4111-8111-111111111111",
          intervalMs: 0,
          timeoutMs: 10,
        },
        {
          api: { getAction },
          pollUntilImpl: async ({ task }) => {
            await task();
            throw new PollingTimeoutError(10);
          },
        },
      ),
    ).rejects.toBeInstanceOf(PollingTimeoutError);
  });
});
