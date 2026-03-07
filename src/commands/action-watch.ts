import type { ActionResponse, ActionStatus, HakoApiClient } from "../lib/hako-api.js";
import type { CommandResult } from "../lib/output.js";
import { pollUntil, type PollingTimeoutError } from "../lib/polling.js";

const TERMINAL_ACTION_STATUSES = new Set<ActionStatus>([
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

export interface ActionWatchOptions {
  readonly actionId: string;
  readonly intervalMs?: number;
  readonly timeoutMs?: number;
}

export interface ActionWatchDeps {
  readonly api: Pick<HakoApiClient, "getAction">;
  readonly pollUntilImpl?: (params: {
    readonly intervalMs: number;
    readonly timeoutMs: number;
    readonly task: () => Promise<{ data: ActionResponse; requestId: string | null }>;
    readonly isDone: (value: {
      data: ActionResponse;
      requestId: string | null;
    }) => boolean;
  }) => Promise<{ data: ActionResponse; requestId: string | null }>;
  readonly now?: () => Date;
}

export interface ActionWatchHistoryItem {
  readonly status: ActionStatus;
  readonly observedAt: string;
  readonly requestId: string | null;
}

export async function runActionWatchCommand(
  options: ActionWatchOptions,
  deps: ActionWatchDeps,
): Promise<
  CommandResult<{
    action: ActionResponse;
    history: ActionWatchHistoryItem[];
    requestId: string | null;
    intervalMs: number;
    timeoutMs: number;
  }>
> {
  const intervalMs = options.intervalMs ?? 5_000;
  const timeoutMs = options.timeoutMs ?? 300_000;
  const executePoll = deps.pollUntilImpl ?? pollUntil;
  const now = deps.now ?? (() => new Date());
  const history: ActionWatchHistoryItem[] = [];

  const response = await executePoll({
    intervalMs,
    timeoutMs,
    task: async () => {
      const current = await deps.api.getAction(options.actionId);
      const previous = history.at(-1)?.status;
      if (previous !== current.data.status) {
        history.push({
          status: current.data.status,
          observedAt: now().toISOString(),
          requestId: current.requestId,
        });
      }

      return current;
    },
    isDone: (current) => TERMINAL_ACTION_STATUSES.has(current.data.status),
  });

  const lines = [
    `Action ${response.data.id} finished with status ${response.data.status}.`,
    "Observed status changes:",
    ...history.map(
      (entry) => `- ${entry.observedAt}: ${entry.status}${entry.requestId ? ` (request ${entry.requestId})` : ""}`,
    ),
  ];

  return {
    lines,
    data: {
      action: response.data,
      history,
      requestId: response.requestId,
      intervalMs,
      timeoutMs,
    },
  };
}

export type { PollingTimeoutError };
