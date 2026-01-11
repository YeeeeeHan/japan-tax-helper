import Dexie, { type EntityTable } from 'dexie';
import type { Receipt, UploadBatch } from '@/types/receipt';

// Define the database schema
export class ReceiptDatabase extends Dexie {
  receipts!: EntityTable<Receipt, 'id'>;
  images!: EntityTable<{ id: string; blob: Blob }, 'id'>;
  batches!: EntityTable<UploadBatch, 'id'>;

  constructor() {
    super('JapanTaxHelper');

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
