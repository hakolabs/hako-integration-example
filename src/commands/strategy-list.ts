import type { HakoApiClient, StrategyDetails } from "../lib/hako-api.js";
import { formatList, formatPercent, formatUsd } from "../lib/output.js";
import type { CommandResult } from "../lib/output.js";

export interface StrategyListDeps {
  readonly api: Pick<HakoApiClient, "getStrategies">;
}

export async function runStrategyListCommand(
  deps: StrategyListDeps,
): Promise<CommandResult<{ strategies: StrategyDetails[]; requestId: string | null }>> {
  const response = await deps.api.getStrategies();
  const lines =
    response.data.length === 0
      ? ["No strategies available."]
      : [
          "Available strategies:",
          ...response.data.flatMap((strategy) => {
            const inputSymbols = [
              ...new Set(strategy.inputTokens.map((token) => token.symbol)),
            ];
            const entrypoints = strategy.entrypoints.map((entrypoint) =>
              entrypoint.isHome
                ? `${entrypoint.network} (home)`
                : entrypoint.network,
            );

            return [
              `- ${strategy.strategyId}: ${strategy.name}`,
              `  APY: ${formatPercent(strategy.statistics.apy)} | TVL: ${formatUsd(strategy.statistics.tvlUsd)}`,
              `  Input tokens: ${formatList(inputSymbols)}`,
              `  Entrypoints: ${formatList(entrypoints)}`,
            ];
          }),
          ...(response.requestId ? [`Request ID: ${response.requestId}`] : []),
        ];

  return {
    lines,
    data: {
      strategies: response.data,
      requestId: response.requestId,
    },
  };
}
