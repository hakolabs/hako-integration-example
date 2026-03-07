import { DEFAULT_STRATEGY_ID } from "../lib/config.js";
import { normalizeChainName } from "../lib/chains.js";
import { generateExternalId } from "../lib/ids.js";
import type { HakoApiClient, WithdrawActionResponse } from "../lib/hako-api.js";
import type { CommandResult } from "../lib/output.js";

export interface WithdrawOptions {
  readonly chain: string;
  readonly token: string;
  readonly amount: string;
  readonly strategyId?: string;
  readonly receiver?: string;
  readonly externalId?: string;
}

export interface WithdrawWallet {
  readonly address: string;
  signTypedDataPayload(authorizationJson: string): Promise<{
    readonly signature: string;
    readonly typedData: Record<string, unknown>;
  }>;
}

export interface WithdrawDeps {
  readonly api: Pick<HakoApiClient, "createWithdrawAction" | "authorizeAction">;
  readonly wallet: WithdrawWallet;
  readonly createExternalId?: typeof generateExternalId;
}

export async function runWithdrawCommand(
  options: WithdrawOptions,
  deps: WithdrawDeps,
): Promise<
  CommandResult<{
    action: WithdrawActionResponse;
    actionId: string;
    externalId: string;
    receiver: string;
    relayTxHash: string;
    signature: string;
    typedData: Record<string, unknown>;
    requestIds: {
      create: string | null;
      authorize: string | null;
    };
    nextCommand: string;
  }>
> {
  const receiver = options.receiver ?? deps.wallet.address;
  const externalId =
    options.externalId ?? (deps.createExternalId ?? generateExternalId)("withdraw");

  const create = await deps.api.createWithdrawAction({
    strategyId: options.strategyId ?? DEFAULT_STRATEGY_ID,
    externalId,
    address: deps.wallet.address,
    receiver,
    network: normalizeChainName(options.chain),
    amount: options.amount.trim(),
    token: options.token.trim(),
  });

  const signed = await deps.wallet.signTypedDataPayload(create.data.authorization);
  const authorize = await deps.api.authorizeAction(create.data.id, signed.signature);
  const nextCommand = `npm run action:watch -- --action-id ${create.data.id}`;

  const lines = [
    `Withdraw action created: ${create.data.id}`,
    `- External ID: ${create.data.externalId}`,
    `- Receiver: ${receiver}`,
    `- Relay tx hash: ${authorize.data.txHash}`,
    `- Expires at: ${create.data.expiresAt}`,
    `- Watch status: ${nextCommand}`,
    ...(create.requestId ? [`Create request ID: ${create.requestId}`] : []),
    ...(authorize.requestId ? [`Authorize request ID: ${authorize.requestId}`] : []),
  ];

  return {
    lines,
    data: {
      action: create.data,
      actionId: create.data.id,
      externalId: create.data.externalId,
      receiver,
      relayTxHash: authorize.data.txHash,
      signature: signed.signature,
      typedData: signed.typedData,
      requestIds: {
        create: create.requestId,
        authorize: authorize.requestId,
      },
      nextCommand,
    },
  };
}
