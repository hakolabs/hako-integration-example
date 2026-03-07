import type { SupportedChain } from "./chains.js";

export type ActionStatus =
  | "NEW"
  | "PROCESSING"
  | "COMPLETING"
  | "PAYOUT_COMPLETED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface ApiRequestResult<T> {
  readonly data: T;
  readonly requestId: string | null;
}

export interface ApiErrorEnvelope {
  readonly error: {
    readonly code?: string;
    readonly message?: string;
    readonly field?: string;
    readonly details?: Record<string, unknown>;
  };
}

export interface HealthResponse {
  readonly status: string;
}

export class HakoApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly field?: string;
  readonly details?: Record<string, unknown>;
  readonly requestId: string | null;
  readonly retryAfter: string | null;

  constructor(params: {
    status: number;
    message: string;
    code?: string;
    field?: string;
    details?: Record<string, unknown>;
    requestId: string | null;
    retryAfter: string | null;
  }) {
    super(params.message);
    this.name = "HakoApiError";
    this.status = params.status;
    this.code = params.code;
    this.field = params.field;
    this.details = params.details;
    this.requestId = params.requestId;
    this.retryAfter = params.retryAfter;
  }
}

export interface StrategyToken {
  readonly symbol: string;
  readonly name: string;
  readonly decimals: number;
  readonly network: SupportedChain;
  readonly address: string;
  readonly logoUrl?: string;
}

export interface StrategyEntrypoint {
  readonly actions: string[];
  readonly network: SupportedChain;
  readonly isHome: boolean;
  readonly contractAddress: string;
}

export interface StrategyDetails {
  readonly strategyId: string;
  readonly name: string;
  readonly description: string;
  readonly inputTokens: StrategyToken[];
  readonly outputTokens: StrategyToken[];
  readonly entrypoints: StrategyEntrypoint[];
  readonly meta: {
    readonly minDepositUsd: number;
    readonly maxDepositUsd: number;
    readonly performanceFeeBps: number;
    readonly managementFeeBps: number;
  };
  readonly statistics: {
    readonly tvlUsd: number;
    readonly apy: number;
    readonly apy7d: number;
    readonly tokenPriceUsd: number;
  };
}

export interface QuoteAmount {
  readonly assetId?: string;
  readonly symbol?: string;
  readonly amount: string;
  readonly amountAtomic: string;
}

export interface DepositQuoteResponse {
  readonly strategyId: string;
  readonly fromAccount: string;
  readonly input: {
    readonly assetId: string;
    readonly amount: string;
    readonly amountAtomic: string;
  };
  readonly expected: {
    readonly sharesOut: QuoteAmount;
    readonly minSharesOut: QuoteAmount;
  };
}

export interface WithdrawQuoteResponse {
  readonly expiresAt: string;
  readonly authorization: {
    readonly method: string;
    readonly gasless: boolean;
  };
  readonly input: {
    readonly mode: "amount";
    readonly assetId: string;
    readonly amount: string;
    readonly amountAtomic: string;
  };
  readonly expected: {
    readonly amountOut: QuoteAmount;
    readonly minAmountOut: QuoteAmount;
  };
  readonly withdrawTo: {
    readonly account: string;
    readonly network: SupportedChain;
    readonly assetId: string;
  };
}

export interface ActionTxPayload {
  readonly to: string;
  readonly data: string;
  readonly value: string;
}

export interface ApprovalTxPayload {
  readonly network: SupportedChain;
  readonly token: string;
  readonly amountRaw: string;
  readonly spenderAddress: string;
  readonly tx: ActionTxPayload;
}

export interface DepositActionResponse {
  readonly id: string;
  readonly externalId: string;
  readonly type: "deposit";
  readonly status: ActionStatus;
  readonly createdAt: string;
  readonly address: string;
  readonly decimals: number;
  readonly network: SupportedChain;
  readonly amount: number;
  readonly amountUsd: number;
  readonly amountRaw: string;
  readonly approvalTx: ApprovalTxPayload | null;
  readonly transaction: {
    readonly network: SupportedChain;
    readonly tx: ActionTxPayload;
  };
}

export interface WithdrawActionResponse {
  readonly id: string;
  readonly externalId: string;
  readonly type: "withdraw";
  readonly status: ActionStatus;
  readonly createdAt: string;
  readonly address: string;
  readonly receiver: string;
  readonly token: string;
  readonly decimals: number;
  readonly network: SupportedChain;
  readonly amount: number;
  readonly amountUsd: number;
  readonly amountRaw: string;
  readonly expiresAt: string;
  readonly authorization: string;
}

export type ActionResponse = DepositActionResponse | WithdrawActionResponse;

export interface PendingAction {
  readonly id: string;
  readonly kind: "deposit" | "withdrawal";
  readonly network: SupportedChain;
  readonly token: string;
  readonly decimals: number;
  readonly amount: number;
  readonly amountUsd: number;
  readonly amountAtomic: string;
}

export interface PositionItem {
  readonly evmAddress: string;
  readonly strategyId: string;
  readonly amount: number;
  readonly amountRaw: string;
  readonly amountUsd: number;
  readonly token: {
    readonly symbol: string;
    readonly decimals: number;
  };
  readonly apy: number;
  readonly pendingActions: PendingAction[];
}

export interface PositionResponse {
  readonly items: PositionItem[];
}

export interface CreateDepositQuoteInput {
  readonly strategyId: string;
  readonly fromAccount: string;
  readonly network: SupportedChain;
  readonly assetId: string;
  readonly amount: string;
}

export interface CreateWithdrawQuoteInput {
  readonly strategyId: string;
  readonly fromAccount: string;
  readonly mode: "amount";
  readonly amount?: string;
  readonly amountAtomic?: string;
  readonly withdrawTo: {
    readonly account: string;
    readonly network: SupportedChain;
    readonly assetId: string;
  };
}

export interface CreateDepositActionInput {
  readonly strategyId: string;
  readonly externalId: string;
  readonly address: string;
  readonly network: SupportedChain;
  readonly amount: string;
  readonly token: string;
}

export interface CreateWithdrawActionInput {
  readonly strategyId: string;
  readonly externalId: string;
  readonly address: string;
  readonly receiver?: string;
  readonly network: SupportedChain;
  readonly amount: string;
  readonly token: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function buildNetworkErrorMessage(url: string, error: unknown): {
  readonly message: string;
  readonly details: Record<string, unknown>;
} {
  const details: Record<string, unknown> = { url };
  if (error instanceof Error) {
    details.originalMessage = error.message;
  }

  if (isRecord(error) && isRecord(error.cause)) {
    const causeCode =
      typeof error.cause.code === "string" ? error.cause.code : undefined;
    const hostname =
      typeof error.cause.hostname === "string" ? error.cause.hostname : undefined;

    if (causeCode) {
      details.causeCode = causeCode;
    }

    if (hostname) {
      details.hostname = hostname;
    }

    if (causeCode === "ENOTFOUND" && hostname) {
      return {
        message: `Could not resolve HAKO_API host ${hostname}. Check the hostname. The public Hako Integration API is available at https://app.hakolabs.app/v1.`,
        details,
      };
    }

    if (causeCode === "ECONNREFUSED") {
      return {
        message: `Could not connect to ${url}. Check that the Hako API is reachable from this machine.`,
        details,
      };
    }
  }

  if (url.startsWith("http://")) {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith(".app")) {
      return {
        message: `Could not reach ${url}. .app domains should use HTTPS. Try https://${parsed.host}${parsed.pathname}.`,
        details,
      };
    }
  }

  return {
    message:
      error instanceof Error
        ? error.message
        : "Network request to Hako API failed",
    details,
  };
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  return isRecord(value) && isRecord(value.error);
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export class HakoApiClient {
  constructor(
    private readonly params: {
      readonly baseUrl: string;
      readonly partnerKey?: string;
    },
  ) {}

  async getHealth(): Promise<ApiRequestResult<HealthResponse>> {
    return this.request<HealthResponse>("/health", {
      method: "GET",
    });
  }

  async getStrategies(): Promise<ApiRequestResult<StrategyDetails[]>> {
    const result = await this.request<{ data: StrategyDetails[] }>("/strategy", {
      method: "GET",
    });

    return {
      data: result.data.data,
      requestId: result.requestId,
    };
  }

  async getPosition(
    address: string,
    strategyId?: string,
  ): Promise<ApiRequestResult<PositionResponse>> {
    const search = new URLSearchParams({ address });
    if (strategyId) {
      search.set("strategyId", strategyId);
    }

    return this.request<PositionResponse>(`/position?${search.toString()}`, {
      method: "GET",
    });
  }

  async createDepositQuote(
    input: CreateDepositQuoteInput,
  ): Promise<ApiRequestResult<DepositQuoteResponse>> {
    return this.request<DepositQuoteResponse>("/quotes/deposit", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async createWithdrawQuote(
    input: CreateWithdrawQuoteInput,
  ): Promise<ApiRequestResult<WithdrawQuoteResponse>> {
    return this.request<WithdrawQuoteResponse>("/quotes/withdraw", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async createDepositAction(
    input: CreateDepositActionInput,
  ): Promise<ApiRequestResult<DepositActionResponse>> {
    return this.request<DepositActionResponse>("/action/deposit", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async createWithdrawAction(
    input: CreateWithdrawActionInput,
  ): Promise<ApiRequestResult<WithdrawActionResponse>> {
    return this.request<WithdrawActionResponse>("/action/withdraw", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async reportAction(
    actionId: string,
    network: SupportedChain,
    txHash: string,
  ): Promise<ApiRequestResult<{ status: "ok" }>> {
    return this.request<{ status: "ok" }>(`/action/${actionId}/report`, {
      method: "POST",
      body: JSON.stringify({ network, txHash }),
    });
  }

  async authorizeAction(
    actionId: string,
    signature: string,
  ): Promise<ApiRequestResult<{ status: "ok"; txHash: string }>> {
    return this.request<{ status: "ok"; txHash: string }>(
      `/action/${actionId}/authorize`,
      {
        method: "POST",
        body: JSON.stringify({ signature }),
      },
    );
  }

  async getAction(actionId: string): Promise<ApiRequestResult<ActionResponse>> {
    return this.request<ActionResponse>(`/action/${actionId}`, {
      method: "GET",
    });
  }

  private async request<T>(
    path: string,
    init: RequestInit,
  ): Promise<ApiRequestResult<T>> {
    const url = `${this.params.baseUrl}${path}`;
    const headers = new Headers(init.headers);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (this.params.partnerKey) {
      headers.set("X-API-Key", this.params.partnerKey);
    }

    let response: Response;

    try {
      response = await fetch(url, {
        ...init,
        headers,
      });
    } catch (error) {
      const networkError = buildNetworkErrorMessage(url, error);
      throw new HakoApiError({
        status: 0,
        code: "NETWORK_ERROR",
        message: networkError.message,
        details: networkError.details,
        requestId: null,
        retryAfter: null,
      });
    }

    const requestId = response.headers.get("X-Request-Id");
    const retryAfter = response.headers.get("Retry-After");
    const body = await parseResponseBody(response);

    if (!response.ok) {
      if (isApiErrorEnvelope(body)) {
        throw new HakoApiError({
          status: response.status,
          code: body.error.code,
          message:
            body.error.message ??
            `Hako API request failed with status ${response.status}`,
          field: body.error.field,
          details: body.error.details,
          requestId,
          retryAfter,
        });
      }

      throw new HakoApiError({
        status: response.status,
        code: "HTTP_ERROR",
        message:
          typeof body === "string" && body
            ? body
            : `Hako API request failed with status ${response.status}`,
        requestId,
        retryAfter,
      });
    }

    return {
      data: body as T,
      requestId,
    };
  }
}
