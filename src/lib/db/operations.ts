import { db } from './schema';
import type { Receipt, UploadBatch, ReceiptFilters } from '@/types/receipt';

/**
 * Add a new receipt to the database
 */
export async function addReceipt(receipt: Receipt): Promise<string> {
  return await db.receipts.add(receipt);
}

/**
 * Update an existing receipt
 */
export async function updateReceipt(id: string, updates: Partial<Receipt>): Promise<void> {
  await db.receipts.update(id, {
    ...updates,
    updatedAt: new Date(),
  });
}

/**
 * Bulk update multiple receipts
 */
export async function bulkUpdateReceipts(
  updates: Array<{ id: string; changes: Partial<Receipt> }>
): Promise<void> {
  await db.transaction('rw', db.receipts, async () => {
    for (const { id, changes } of updates) {
      await db.receipts.update(id, {
        ...changes,
        updatedAt: new Date(),
      });
    }
  });
}

/**
 * Get a single receipt by ID
 */
export async function getReceipt(id: string): Promise<Receipt | undefined> {
  return await db.receipts.get(id);
}

/**
 * Get all receipts with optional filters
 */
export async function getReceipts(filters?: ReceiptFilters): Promise<Receipt[]> {
  let query = db.receipts.toCollection();

  if (filters) {
    // Filter by status
    if (filters.status === '要確認') {
      query = query.filter(r => r.needsReview);
    } else if (filters.status === '完了') {
      query = query.filter(r => !r.needsReview && r.processingStatus === 'completed');
    }

    // Filter by category
    if (filters.category && filters.category !== 'すべて') {
      query = query.filter(r => r.extractedData.suggestedCategory === filters.category);
    }

    // Filter by date range
    if (filters.dateRange) {
      query = query.filter(r => {
        const date = r.extractedData.transactionDate;
        return date >= filters.dateRange!.from && date <= filters.dateRange!.to;
      });
    }

    // Filter by search query - searches across all metadata
    if (filters.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase().trim();
      query = query.filter(r => {
        // Helper to safely get lowercase string
        const safe = (val: string | null | undefined): string =>
          (val ?? '').toLowerCase();

        // Search across all relevant fields
        const searchableFields = [
          safe(r.extractedData.issuerName),
          safe(r.extractedData.description),
          safe(r.extractedData.tNumber),
          safe(r.extractedData.suggestedCategory),
          safe(r.extractedData.issuerAddress),
          safe(r.extractedData.issuerPhone),
          safe(r.extractedData.recipientName),
          safe(r.extractedData.paymentMethod),
          safe(r.notes),
          // Also search by amount (formatted)
          String(r.extractedData.totalAmount),
        ];

        return searchableFields.some(field => field.includes(searchLower));
      });
    }
  }

  return await query.reverse().sortBy('createdAt');
}

/**
 * Delete a receipt and its associated image
 */
export async function deleteReceipt(id: string): Promise<void> {
  const receipt = await db.receipts.get(id);
  if (receipt) {
    await db.images.delete(receipt.imageId);
    await db.receipts.delete(id);
  }
}

/**
 * Get receipts count by status
 */
export async function getReceiptCounts(): Promise<{
  total: number;
  uploaded: number;
  processing: number;
  completed: number;
  needsReview: number;
}> {
  const all = await db.receipts.toArray();

  return {
    total: all.length,
    uploaded: all.filter(r => r.processingStatus === 'pending').length,
    processing: all.filter(r => r.processingStatus === 'processing').length,
    completed: all.filter(r => r.processingStatus === 'completed' && !r.needsReview).length,
    needsReview: all.filter(r => r.needsReview).length,
  };
}

/**
 * Add an upload batch
 */
export async function addBatch(batch: UploadBatch): Promise<string> {
  return await db.batches.add(batch);
}

/**
 * Update a batch
 */
export async function updateBatch(id: string, updates: Partial<UploadBatch>): Promise<void> {
  await db.batches.update(id, updates);
}

/**
 * Get storage quota information
 */
export async function getStorageInfo(): Promise<{
  used: number;
  available: number;
  percentUsed: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      available: estimate.quota || 0,
      percentUsed: ((estimate.usage || 0) / (estimate.quota || 1)) * 100,
    };
  }
  return { used: 0, available: Infinity, percentUsed: 0 };
}

/**
 * Clear all data (for testing or reset)
 */
export async function clearAllData(): Promise<void> {
  await db.receipts.clear();
  await db.images.clear();
  await db.batches.clear();
}
