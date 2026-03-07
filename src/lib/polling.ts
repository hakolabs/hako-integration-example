export class PollingTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`Timed out after ${timeoutMs}ms while waiting for action to complete`);
    this.name = "PollingTimeoutError";
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function pollUntil<T>(params: {
  readonly intervalMs: number;
  readonly timeoutMs: number;
  readonly task: () => Promise<T>;
  readonly isDone: (value: T) => boolean;
}): Promise<T> {
  const startedAt = Date.now();

  while (true) {
    const result = await params.task();
    if (params.isDone(result)) {
      return result;
    }

    if (Date.now() - startedAt >= params.timeoutMs) {
      throw new PollingTimeoutError(params.timeoutMs);
    }

    await sleep(params.intervalMs);
  }
}
