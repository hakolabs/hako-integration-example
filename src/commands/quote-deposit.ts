import { DEFAULT_STRATEGY_ID } from "../lib/config.js";
import { normalizeChainName } from "../lib/chains.js";
import type { DepositQuoteResponse, HakoApiClient } from "../lib/hako-api.js";
import type { CommandResult } from "../lib/output.js";

export interface QuoteDepositOptions {
  readonly chain: string;
  readonly token: string;
  readonly amount: string;
  readonly strategyId?: string;
}

export interface QuoteDepositDeps {
  readonly api: Pick<HakoApiClient, "createDepositQuote">;
  readonly walletAddress: string;
}

export async function runQuoteDepositCommand(
  options: QuoteDepositOptions,
  deps: QuoteDepositDeps,
): Promise<CommandResult<{ quote: DepositQuoteResponse; requestId: string | null }>> {
  const response = await deps.api.createDepositQuote({
    strategyId: options.strategyId ?? DEFAULT_STRATEGY_ID,
    fromAccount: deps.walletAddress,
    network: normalizeChainName(options.chain),
    assetId: options.token.trim(),
    amount: options.amount.trim(),
  });

  const lines = [
    `Deposit quote for ${options.amount} ${options.token.toUpperCase()} on ${normalizeChainName(options.chain)}:`,
    `- Strategy: ${response.data.strategyId}`,
    `- Shares out: ${response.data.expected.sharesOut.amount} (${response.data.expected.sharesOut.amountAtomic} atomic)`,
    `- Min shares out: ${response.data.expected.minSharesOut.amount} (${response.data.expected.minSharesOut.amountAtomic} atomic)`,
    ...(response.requestId ? [`Request ID: ${response.requestId}`] : []),
  ];

  return {
    lines,
    data: {
      quote: response.data,
      requestId: response.requestId,
    },
  };
}
