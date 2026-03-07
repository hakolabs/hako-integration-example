import { HakoApiError } from "./hako-api.js";

export interface CommandResult<T = unknown> {
  readonly lines: string[];
  readonly data: T;
}

export interface OutputOptions {
  readonly json: boolean;
  readonly write?: (line: string) => void;
  readonly writeError?: (line: string) => void;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function formatList(items: string[]): string {
  return items.length === 0 ? "none" : items.join(", ");
}

function defaultWrite(line: string): void {
  console.log(line);
}

function defaultWriteError(line: string): void {
  console.error(line);
}

export function printCommandResult<T>(
  result: CommandResult<T>,
  options: OutputOptions,
): void {
  const write = options.write ?? defaultWrite;
  if (options.json) {
    write(JSON.stringify(result.data, null, 2));
    return;
  }

  for (const line of result.lines) {
    write(line);
  }
}

export function renderError(error: unknown): CommandResult<Record<string, unknown>> {
  if (error instanceof HakoApiError) {
    const data = {
      error: {
        name: error.name,
        status: error.status,
        code: error.code ?? null,
        message: error.message,
        field: error.field ?? null,
        details: error.details ?? null,
        requestId: error.requestId,
        retryAfter: error.retryAfter,
      },
    };

    const lines = [
      `Hako API error (${error.status}${error.code ? ` ${error.code}` : ""}): ${error.message}`,
      ...(error.field ? [`Field: ${error.field}`] : []),
      ...(error.requestId ? [`Request ID: ${error.requestId}`] : []),
      ...(error.retryAfter ? [`Retry-After: ${error.retryAfter}`] : []),
    ];

    return { lines, data };
  }

  if (error instanceof Error) {
    return {
      lines: [error.message],
      data: {
        error: {
          name: error.name,
          message: error.message,
        },
      },
    };
  }

  return {
    lines: ["Unknown error"],
    data: {
      error: {
        name: "UnknownError",
        message: "Unknown error",
        raw: error,
      },
    },
  };
}

export function printCommandError(error: unknown, options: OutputOptions): void {
  const rendered = renderError(error);
  const write = options.writeError ?? options.write ?? defaultWriteError;

  if (options.json) {
    write(JSON.stringify(rendered.data, null, 2));
    return;
  }

  for (const line of rendered.lines) {
    write(line);
  }
}
