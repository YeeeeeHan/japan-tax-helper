// Concurrency controller for parallel processing with limits
// Processes items with a maximum number of concurrent operations

export interface ConcurrencyOptions {
  concurrency?: number; // Max concurrent operations (default: 3)
  onProgress?: (completed: number, total: number) => void;
  onError?: (error: any, item: any, index: number) => void;
  stopOnError?: boolean; // Stop all processing on first error (default: false)
  staggerDelayMs?: number; // Delay between starting each operation (default: 0)
}

const DEFAULT_CONCURRENCY_OPTIONS: Required<ConcurrencyOptions> = {
  concurrency: 3,
  onProgress: () => {},
  onError: () => {},
  stopOnError: false,
  staggerDelayMs: 0,
};

/**
 * Process items with limited concurrency
 *
 * @param items - Array of items to process
 * @param processFn - Async function to process each item
 * @param options - Concurrency configuration
 * @returns Array of results (same order as input, with null for failures if stopOnError=false)
 *
 * @example
 * const results = await processConcurrently(
 *   files,
 *   async (file, index) => {
 *     return await uploadFile(file);
 *   },
 *   { concurrency: 5, staggerDelayMs: 200 }
 * );
 */
export async function processConcurrently<T, R>(
  items: T[],
  processFn: (item: T, index: number) => Promise<R>,
  options: ConcurrencyOptions = {}
): Promise<(R | null)[]> {
  const opts = { ...DEFAULT_CONCURRENCY_OPTIONS, ...options };

  if (items.length === 0) {
    return [];
  }

  const results: (R | null)[] = new Array(items.length).fill(null);
  let completed = 0;
  let hasError = false;

  // Create a queue of work items with their indices
  const queue = items.map((item, index) => ({ item, index }));

  // Worker function that processes items from the queue
  const worker = async (workerId: number): Promise<void> => {
    while (queue.length > 0 && !hasError) {
      const work = queue.shift();
      if (!work) break;

      const { item, index } = work;

      try {
        // Stagger the start of each operation to avoid thundering herd
        if (opts.staggerDelayMs > 0 && index > 0) {
          await new Promise(resolve => setTimeout(resolve, opts.staggerDelayMs * workerId));
        }

        console.log(`[Concurrency] Worker ${workerId} processing item ${index + 1}/${items.length}`);

        const result = await processFn(item, index);
        results[index] = result;
        completed++;

        opts.onProgress(completed, items.length);

        console.log(`[Concurrency] Worker ${workerId} completed item ${index + 1}/${items.length} (${completed}/${items.length} total)`);
      } catch (error: any) {
        console.error(`[Concurrency] Worker ${workerId} failed on item ${index + 1}:`, error);

        opts.onError(error, item, index);
        completed++;
        opts.onProgress(completed, items.length);

        if (opts.stopOnError) {
          hasError = true;
          throw error; // Propagate error to stop all workers
        }
        // Otherwise, continue processing other items (result stays null)
      }
    }
  };

  // Launch workers up to concurrency limit
  const workers: Promise<void>[] = [];
  const workerCount = Math.min(opts.concurrency, items.length);

  console.log(`[Concurrency] Starting ${workerCount} workers for ${items.length} items`);

  for (let i = 0; i < workerCount; i++) {
    workers.push(worker(i));
  }

  // Wait for all workers to complete
  try {
    await Promise.all(workers);
  } catch (error) {
    if (opts.stopOnError) {
      throw error;
    }
    // Otherwise, error was already handled by onError callback
  }

  console.log(`[Concurrency] All workers finished. Completed: ${completed}/${items.length}`);

  return results;
}

/**
 * Process items in batches (alternative to processConcurrently)
 * Simpler approach: processes N items at once, waits for batch to complete, then next batch
 *
 * @param items - Array of items to process
 * @param processFn - Async function to process each item
 * @param batchSize - Number of items to process concurrently per batch
 * @returns Array of results (same order as input)
 */
export async function processBatches<T, R>(
  items: T[],
  processFn: (item: T, index: number) => Promise<R>,
  batchSize: number = 3
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, batchIndex) => processFn(item, i + batchIndex))
    );
    results.push(...batchResults);

    console.log(`[Batch] Completed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`);
  }

  return results;
}
