import { DEFAULT_STRATEGY_ID } from "../lib/config.js";
import { normalizeChainName, type SupportedChain } from "../lib/chains.js";
import { generateExternalId } from "../lib/ids.js";
import type { ActionTxPayload, DepositActionResponse, HakoApiClient } from "../lib/hako-api.js";
import type { CommandResult } from "../lib/output.js";

export interface DepositOptions {
  readonly chain: string;
  readonly token: string;
  readonly amount: string;
  readonly strategyId?: string;
  readonly externalId?: string;
}

export interface DepositWallet {
  readonly address: string;
  sendPreparedTransaction(params: {
    readonly network: SupportedChain;
    readonly tx: ActionTxPayload;
  }): Promise<string>;
}

export interface DepositDeps {
  readonly api: Pick<HakoApiClient, "createDepositAction" | "reportAction">;
  readonly wallet: DepositWallet;
  readonly createExternalId?: typeof generateExternalId;
}

export async function runDepositCommand(
  options: DepositOptions,
  deps: DepositDeps,
): Promise<
  CommandResult<{
    action: DepositActionResponse;
    actionId: string;
    externalId: string;
    approvalTxHash: string | null;
    depositTxHash: string;
    reportStatus: "ok";
    requestIds: {
      create: string | null;
      report: string | null;
    };
    nextCommand: string;
  }>
> {
  const externalId =
    options.externalId ?? (deps.createExternalId ?? generateExternalId)("deposit");

  const create = await deps.api.createDepositAction({
    strategyId: options.strategyId ?? DEFAULT_STRATEGY_ID,
    externalId,
    address: deps.wallet.address,
    network: normalizeChainName(options.chain),
    amount: options.amount.trim(),
    token: options.token.trim(),
  });

  let approvalTxHash: string | null = null;
  if (create.data.approvalTx) {
    approvalTxHash = await deps.wallet.sendPreparedTransaction({
      network: create.data.approvalTx.network,
      tx: create.data.approvalTx.tx,
    });
  }

  const depositTxHash = await deps.wallet.sendPreparedTransaction({
    network: create.data.transaction.network,
    tx: create.data.transaction.tx,
  });

  const report = await deps.api.reportAction(
    create.data.id,
    create.data.transaction.network,
    depositTxHash,
  );

  const nextCommand = `npm run action:watch -- --action-id ${create.data.id}`;
  const lines = [
    `Deposit action created: ${create.data.id}`,
    `- External ID: ${create.data.externalId}`,
    ...(approvalTxHash ? [`- Approval tx hash: ${approvalTxHash}`] : []),
    `- Deposit tx hash: ${depositTxHash}`,
    `- Report status: ${report.data.status}`,
    `- Watch status: ${nextCommand}`,
    ...(create.requestId ? [`Create request ID: ${create.requestId}`] : []),
    ...(report.requestId ? [`Report request ID: ${report.requestId}`] : []),
  ];

  return {
    lines,
    data: {
      action: create.data,
      actionId: create.data.id,
      externalId: create.data.externalId,
      approvalTxHash,
      depositTxHash,
      reportStatus: report.data.status,
      requestIds: {
        create: create.requestId,
        report: report.requestId,
      },
      nextCommand,
    },
  };
}
