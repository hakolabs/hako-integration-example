import type { HakoApiClient, PositionResponse } from "../lib/hako-api.js";
import { formatUsd } from "../lib/output.js";
import type { CommandResult } from "../lib/output.js";

export interface PositionOptions {
  readonly strategyId?: string;
}

export interface PositionDeps {
  readonly api: Pick<HakoApiClient, "getPosition">;
  readonly walletAddress: string;
}

export async function runPositionCommand(
  options: PositionOptions,
  deps: PositionDeps,
): Promise<
  CommandResult<{
    walletAddress: string;
    position: PositionResponse;
    requestId: string | null;
  }>
> {
  const response = await deps.api.getPosition(
    deps.walletAddress,
    options.strategyId,
  );

  const lines =
    response.data.items.length === 0
      ? [
          `No position items found for ${deps.walletAddress}.`,
          ...(response.requestId ? [`Request ID: ${response.requestId}`] : []),
        ]
      : [
          `Positions for ${deps.walletAddress}:`,
          ...response.data.items.flatMap((item) => {
            const pendingActionLines =
              item.pendingActions.length === 0
                ? ["  Pending actions: none"]
                : [
                    "  Pending actions:",
                    ...item.pendingActions.map(
                      (action) =>
                        `  - ${action.kind} ${action.id} on ${action.network} (${action.amount} ${action.token})`,
                    ),
                  ];

            return [
              `- ${item.strategyId}: ${item.amount} ${item.token.symbol} (${formatUsd(item.amountUsd)})`,
              `  APY: ${item.apy.toFixed(2)}%`,
              ...pendingActionLines,
            ];
          }),
          ...(response.requestId ? [`Request ID: ${response.requestId}`] : []),
        ];

  return {
    lines,
    data: {
      walletAddress: deps.walletAddress,
      position: response.data,
      requestId: response.requestId,
    },
  };
}
