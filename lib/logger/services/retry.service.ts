// ============================================================================
// Discord Logger - Retry Service (Exponential Backoff)
// ============================================================================

/** Options for configuring retry behaviour */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in milliseconds */
  baseDelay: number;
  /** Maximum delay cap in milliseconds */
  maxDelay: number;
  /** Whether to add random jitter to delays */
  jitter: boolean;
}

/** Default retry options */
const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30_000,
  jitter: true,
};

/**
 * Calculates the backoff delay for a given attempt using exponential backoff.
 *
 * @param attempt - The current attempt number (0-indexed)
 * @param baseDelay - Base delay in ms
 * @param maxDelay - Maximum delay cap in ms
 * @param jitter - Whether to add random jitter
 * @returns Delay in milliseconds
 */
export function calculateBackoff(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  jitter: boolean
): number {
  // Exponential: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  if (jitter) {
    // Full jitter: random value between 0 and cappedDelay
    return Math.floor(Math.random() * cappedDelay);
  }

  return cappedDelay;
}

/**
 * Wraps an async function with retry logic using exponential backoff.
 *
 * @param fn - The async function to retry
 * @param options - Retry configuration
 * @returns The result of the function
 * @throws The last error if all retries are exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt >= opts.maxRetries) {
        break;
      }

      const delay = calculateBackoff(
        attempt,
        opts.baseDelay,
        opts.maxDelay,
        opts.jitter
      );

      console.warn(
        `[Discord Logger] Retry ${attempt + 1}/${opts.maxRetries} ` +
          `after ${delay}ms - ${lastError.message}`
      );

      await sleep(delay);
    }
  }

  throw lastError ?? new Error('All retries exhausted');
}

/** Promise-based sleep utility */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Singleton-style exports
export const retryService = {
  withRetry,
  calculateBackoff,
};
