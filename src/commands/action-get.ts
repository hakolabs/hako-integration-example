import type { ActionResponse, HakoApiClient } from "../lib/hako-api.js";
import { formatUsd } from "../lib/output.js";
import type { CommandResult } from "../lib/output.js";

export interface ActionGetOptions {
  readonly actionId: string;
}

export interface ActionGetDeps {
  readonly api: Pick<HakoApiClient, "getAction">;
}

export async function runActionGetCommand(
  options: ActionGetOptions,
  deps: ActionGetDeps,
): Promise<CommandResult<{ action: ActionResponse; requestId: string | null }>> {
  const response = await deps.api.getAction(options.actionId);
  const action = response.data;

  const lines = [
    `Action ${action.id}:`,
    `- Type: ${action.type}`,
    `- Status: ${action.status}`,
    `- Network: ${action.network}`,
    `- Amount: ${action.amount}`,
    `- Amount USD: ${formatUsd(action.amountUsd)}`,
    `- External ID: ${action.externalId}`,
    `- Created at: ${action.createdAt}`,
    ...(response.requestId ? [`Request ID: ${response.requestId}`] : []),
  ];

  if (action.type === "deposit") {
    lines.splice(4, 0, `- Execution tx network: ${action.transaction.network}`);
    lines.splice(
      5,
      0,
      `- Approval required: ${action.approvalTx ? "yes" : "no"}`,
    );
    if (action.approvalTx) {
      lines.splice(6, 0, `- Approval network: ${action.approvalTx.network}`);
    }
  }

  if (action.type === "withdraw") {
    lines.splice(6, 0, `- Receiver: ${action.receiver}`);
    lines.splice(7, 0, `- Expires at: ${action.expiresAt}`);
    lines.splice(8, 0, "- Authorization payload: present");
  }

  return {
    lines,
    data: {
      action: response.data,
      requestId: response.requestId,
    },
  };
}
