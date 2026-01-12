import Dexie, { type EntityTable } from 'dexie';
import type { Receipt, UploadBatch, UploadQueueItem } from '@/types/receipt';

// Define the database schema
export class ReceiptDatabase extends Dexie {
  receipts!: EntityTable<Receipt, 'id'>;
  images!: EntityTable<{ id: string; blob: Blob }, 'id'>;
  batches!: EntityTable<UploadBatch, 'id'>;
  uploadQueue!: EntityTable<UploadQueueItem, 'id'>;

  constructor() {
    super('JapanTaxHelper');

    // Version 1: Original schema
    this.version(1).stores({
      // Receipts table with indexes
      receipts: `
        id,
        createdAt,
        [extractedData.transactionDate],
        [extractedData.suggestedCategory],
        processingStatus,
        needsReview,
        [extractedData.tNumber]
      `,
      // Images table (separate for better performance)
      images: 'id',
      // Batches table
      batches: 'id, createdAt, status',
    });

    // Version 2: Add upload queue
    this.version(2).stores({
      receipts: `
        id,
        createdAt,
        [extractedData.transactionDate],
        [extractedData.suggestedCategory],
        processingStatus,
        needsReview,
        [extractedData.tNumber]
      `,
      images: 'id',
      batches: 'id, createdAt, status',
      // Upload queue table
      uploadQueue: 'id, createdAt, status, receiptId',
    });

    // Version 3: Migrate category 損害保険料 → 保険料
    // This handles the category rename without changing the schema
    this.version(3).stores({
      receipts: `
        id,
        createdAt,
        [extractedData.transactionDate],
        [extractedData.suggestedCategory],
        processingStatus,
        needsReview,
        [extractedData.tNumber]
      `,
      images: 'id',
      batches: 'id, createdAt, status',
      uploadQueue: 'id, createdAt, status, receiptId',
    }).upgrade(async (tx) => {
      // Migrate existing receipts with 損害保険料 to 保険料
      const receipts = await tx.table('receipts').toArray();
      for (const receipt of receipts) {
        if (receipt.extractedData?.suggestedCategory === '損害保険料') {
          await tx.table('receipts').update(receipt.id, {
            'extractedData.suggestedCategory': '保険料',
            updatedAt: new Date(),
          });
        }
      }
    });
  }
}

// Create and export database instance
export const db = new ReceiptDatabase();

// Helper type for receipt with proper date handling
export type ReceiptWithDates = Omit<Receipt, 'createdAt' | 'updatedAt' | 'extractedData'> & {
  createdAt: Date;
  updatedAt: Date;
  extractedData: Omit<Receipt['extractedData'], 'transactionDate'> & {
    transactionDate: Date;
  };
};
