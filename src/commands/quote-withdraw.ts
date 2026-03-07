import { DEFAULT_STRATEGY_ID } from "../lib/config.js";
import { normalizeChainName } from "../lib/chains.js";
import type { HakoApiClient, WithdrawQuoteResponse } from "../lib/hako-api.js";
import type { CommandResult } from "../lib/output.js";

export interface QuoteWithdrawOptions {
  readonly chain: string;
  readonly token: string;
  readonly amount: string;
  readonly strategyId?: string;
  readonly receiver?: string;
}

export interface QuoteWithdrawDeps {
  readonly api: Pick<HakoApiClient, "createWithdrawQuote">;
  readonly walletAddress: string;
}

export async function runQuoteWithdrawCommand(
  options: QuoteWithdrawOptions,
  deps: QuoteWithdrawDeps,
): Promise<CommandResult<{ quote: WithdrawQuoteResponse; requestId: string | null }>> {
  const network = normalizeChainName(options.chain);
  const receiver = options.receiver ?? deps.walletAddress;
  const response = await deps.api.createWithdrawQuote({
    strategyId: options.strategyId ?? DEFAULT_STRATEGY_ID,
    fromAccount: deps.walletAddress,
    mode: "amount",
    amount: options.amount.trim(),
    withdrawTo: {
      account: receiver,
      network,
      assetId: options.token.trim(),
    },
  });

  const lines = [
    `Withdraw quote for ${options.amount} ${options.token.toUpperCase()} on ${network}:`,
    `- Receiver: ${receiver}`,
    `- Amount out: ${response.data.expected.amountOut.amount} (${response.data.expected.amountOut.amountAtomic} atomic)`,
    `- Min amount out: ${response.data.expected.minAmountOut.amount} (${response.data.expected.minAmountOut.amountAtomic} atomic)`,
    `- Authorization method: ${response.data.authorization.method}`,
    `- Gasless: ${response.data.authorization.gasless}`,
    `- Expires at: ${response.data.expiresAt}`,
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
