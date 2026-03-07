/**
 * Retry an async operation for transient RPC errors (e.g. starknet_call failures).
 * Use when a single failure might be due to rate limits or network flakiness.
 */
const DEFAULT_RETRIES = 3;
const DEFAULT_DELAY_MS = 600;

export async function withRpcRetry<T>(
  fn: () => Promise<T>,
  options?: { retries?: number; delayMs?: number }
): Promise<T> {
  const retries = options?.retries ?? DEFAULT_RETRIES;
  const delayMs = options?.delayMs ?? DEFAULT_DELAY_MS;
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError;
}
