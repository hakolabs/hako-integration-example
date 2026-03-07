import type { HakoApiClient, HealthResponse, PositionResponse, StrategyDetails } from "../lib/hako-api.js";
import type { CommandResult } from "../lib/output.js";
import { formatList } from "../lib/output.js";

export interface DoctorDeps {
  readonly rawHakoApiUrl: string;
  readonly normalizedHakoApiBaseUrl: string;
  readonly publicApi: Pick<HakoApiClient, "getHealth" | "getStrategies">;
  readonly authenticatedApi?: Pick<HakoApiClient, "getPosition">;
  readonly authenticatedAddress?: string;
  readonly walletAddress?: string;
}

export interface DoctorResult {
  readonly api: {
    readonly raw: string;
    readonly normalized: string;
    readonly normalizedChanged: boolean;
  };
  readonly health: ApiCheckResult<HealthResponse>;
  readonly strategy: ApiCheckResult<{
    readonly count: number;
    readonly strategyIds: string[];
    readonly strategies: StrategyDetails[];
  }>;
  readonly authenticated: ApiCheckResult<{
    readonly address: string;
    readonly position: PositionResponse;
  }> | { status: "skipped"; reason: string };
  readonly wallet:
    | {
        status: "ok";
        address: string;
      }
    | { status: "skipped"; reason: string };
}

interface ApiCheckResult<T> {
  readonly status: "ok";
  readonly requestId: string | null;
  readonly data: T;
}

export async function runDoctorCommand(
  deps: DoctorDeps,
): Promise<CommandResult<DoctorResult>> {
  const health = await deps.publicApi.getHealth();
  const strategies = await deps.publicApi.getStrategies();
  if (deps.authenticatedApi && !deps.authenticatedAddress) {
    throw new Error(
      "doctor requires an authenticated address when PARTNER_KEY is configured",
    );
  }
  const authenticatedCheck = deps.authenticatedApi
    ? await deps.authenticatedApi.getPosition(deps.authenticatedAddress ?? "")
    : null;

  const authenticated = authenticatedCheck
    ? {
        status: "ok" as const,
        requestId: authenticatedCheck.requestId,
        data: {
          address: deps.authenticatedAddress ?? "",
          position: authenticatedCheck.data,
        },
      }
    : {
        status: "skipped" as const,
        reason: "PARTNER_KEY is not set",
      };

  const wallet = deps.walletAddress
    ? {
        status: "ok" as const,
        address: deps.walletAddress,
      }
    : {
        status: "skipped" as const,
        reason: "PRIVATE_KEY is not set",
      };

  const result: DoctorResult = {
    api: {
      raw: deps.rawHakoApiUrl,
      normalized: deps.normalizedHakoApiBaseUrl,
      normalizedChanged:
        deps.rawHakoApiUrl.trim() !== deps.normalizedHakoApiBaseUrl,
    },
    health: {
      status: "ok",
      requestId: health.requestId,
      data: health.data,
    },
    strategy: {
      status: "ok",
      requestId: strategies.requestId,
      data: {
        count: strategies.data.length,
        strategyIds: strategies.data.map((strategy) => strategy.strategyId),
        strategies: strategies.data,
      },
    },
    authenticated,
    wallet,
  };

  const lines = [
    "Hako Integration Example doctor",
    `- Raw HAKO_API: ${result.api.raw}`,
    `- Normalized API base URL: ${result.api.normalized}${result.api.normalizedChanged ? " (normalized)" : ""}`,
    `- Public health check: ok${health.requestId ? ` (request ${health.requestId})` : ""}`,
    `- Public strategy check: ok (${strategies.data.length} strategies: ${formatList(strategies.data.map((strategy) => strategy.strategyId))})${strategies.requestId ? ` (request ${strategies.requestId})` : ""}`,
    result.authenticated.status === "ok"
      ? `- Authenticated API check: ok for ${result.authenticated.data.address} (${result.authenticated.data.position.items.length} position items)${result.authenticated.requestId ? ` (request ${result.authenticated.requestId})` : ""}`
      : `- Authenticated API check: skipped (${result.authenticated.reason})`,
    result.wallet.status === "ok"
      ? `- Derived wallet address: ${result.wallet.address}`
      : `- Derived wallet address: skipped (${result.wallet.reason})`,
  ];

  return {
    lines,
    data: result,
  };
}
