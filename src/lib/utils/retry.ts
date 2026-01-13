// Retry utility with exponential backoff
// Handles transient failures (429, 500, 503) with intelligent retry logic

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  multiplier?: number;
  retryableStatusCodes?: number[];
  onRetry?: (attempt: number, error: any, delayMs: number) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 2000, // Start with 2 seconds
  multiplier: 2, // Double each time: 2s, 4s, 8s, 16s
  retryableStatusCodes: [429, 500, 503], // Rate limit, server errors
  onRetry: () => {}, // No-op by default
};

/**
 * Generic retry wrapper with exponential backoff
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration
 * @returns Result of fn
 * @throws Last error if all retries exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if we should retry
      const shouldRetry =
        attempt < opts.maxRetries &&
        isRetryableError(error, opts.retryableStatusCodes);

      if (!shouldRetry) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const baseDelay = opts.initialDelayMs * Math.pow(opts.multiplier, attempt);
      const jitter = baseDelay * 0.25 * (Math.random() - 0.5); // ±12.5%
      const delayMs = Math.round(baseDelay + jitter);

      // Notify caller about retry
      opts.onRetry(attempt + 1, error, delayMs);

      console.log(
        `[Retry] Attempt ${attempt + 1}/${opts.maxRetries} failed. Retrying in ${delayMs}ms...`,
        error.message || error
      );

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Specialized retry wrapper for fetch Response objects
 *
 * @param fn - Async function that returns a Response
 * @param options - Retry configuration
 * @returns Response from fn
 */
export async function retryApiCall(
  fn: () => Promise<Response>,
  options: RetryOptions = {}
): Promise<Response> {
  return withRetry(async () => {
    const response = await fn();

    // Check if response status is retryable
    const retryableStatusCodes = options.retryableStatusCodes || DEFAULT_RETRY_OPTIONS.retryableStatusCodes;
    if (!response.ok && retryableStatusCodes.includes(response.status)) {
      // Clone response before reading body (can only read once)
      const errorData = await response.clone().json().catch(() => ({}));
      const error: any = new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`
      );
      error.status = response.status;
      error.response = response;
      throw error;
    }

    return response;
  }, options);
}

/**
 * Check if error is retryable based on status code
 */
function isRetryableError(error: any, retryableStatusCodes: number[]): boolean {
  // Check if error has a status code
  if (error.status !== undefined) {
    return retryableStatusCodes.includes(error.status);
  }

  // Check if error is a Response object
  if (error.response instanceof Response) {
    return retryableStatusCodes.includes(error.response.status);
  }

  // Network errors are retryable
  if (
    error.message?.includes('fetch failed') ||
    error.message?.includes('network') ||
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT'
  ) {
    return true;
  }

  // Default: don't retry
  return false;
}
