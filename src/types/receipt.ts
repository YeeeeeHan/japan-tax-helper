// Receipt-related TypeScript types

export interface Receipt {
  id: string; // UUID v4
  createdAt: Date;
  updatedAt: Date;

  // Original image
  imageId: string; // Reference to blob storage
  imageUrl: string; // Blob URL for display
  fileName: string;
  fileSize: number;
  mimeType: string;

  // Extracted data
  extractedData: ExtractedData;

  // Processing metadata
  processingStatus: ProcessingStatus;
  confidence: ConfidenceScore;

  // User flags
  isManuallyReviewed: boolean;
  needsReview: boolean;
  notes?: string;

  // Dev metadata (only populated in development)
  _dev?: {
    strategy?: string;       // OCR strategy used (e.g., 'claude-sonnet', 'gemini-2.0-flash')
    processingTimeMs?: number;
    estimatedCost?: number;
  };
}

export interface ExtractedData {
  // 1. Issuer information
  issuerName: string; // 発行事業者名
  tNumber: string | null; // 登録番号 (T + 13 digits)
  issuerAddress?: string;
  issuerPhone?: string;

  // 2. Transaction date
  transactionDate: Date; // 取引年月日

  // 3. Transaction details
  description: string; // 取引内容
  items?: ReceiptItem[]; // Line items if available

  // 4. Amount by tax rate
  subtotalExcludingTax: number; // 税抜金額
  taxBreakdown: TaxBreakdown[]; // Tax by rate (8%, 10%)

  // 5. Total amount
  totalAmount: number; // 合計金額（税込）

  // 6. Recipient (optional for simplified receipts)
  recipientName?: string;

  // Auto-categorization
  suggestedCategory: ExpenseCategory;
  categoryConfidence: number; // 0-1

  // Payment method (if available)
  paymentMethod?: PaymentMethod;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // 8 or 10
  amount: number;
}

export interface TaxBreakdown {
  taxRate: number; // 8 or 10 (%)
  subtotal: number; // 対象金額
  taxAmount: number; // 消費税額
  total: number; // 税込金額
}

export type ProcessingStatus =
  | 'pending' // Queued for processing
  | 'processing' // Currently being processed
  | 'completed' // Successfully processed
  | 'failed' // Processing failed
  | 'manual'; // Requires manual entry

export interface ConfidenceScore {
  overall: number; // 0-1 (overall confidence)
  fields: {
    issuerName: number;
    tNumber: number;
    transactionDate: number;
    totalAmount: number;
    taxBreakdown: number;
    category: number;
  };
}

export type ExpenseCategory =
  | '旅費交通費' // Travel and transportation
  | '交際費' // Entertainment
  | '消耗品費' // Consumables
  | '通信費' // Communication
  | '水道光熱費' // Utilities
  | '広告宣伝費' // Advertising
  | '損害保険料' // Insurance
  | '租税公課' // Taxes and dues
  | '地代家賃' // Rent
  | '外注費' // Outsourcing
  | '会議費' // Meeting expenses
  | '研修費' // Training
  | '新聞図書費' // Books and subscriptions
  | '未分類'; // Uncategorized

export type PaymentMethod =
  | 'cash' // 現金
  | 'credit_card' // クレジットカード
  | 'debit' // デビット
  | 'electronic_money' // 電子マネー
  | 'bank_transfer' // 銀行振込
  | 'unknown'; // 不明

// API response from Gemini
export interface GeminiExtractionResponse {
  extractedData: ExtractedData;
  confidence: ConfidenceScore;
  rawText?: string; // Full OCR text for debugging
  warnings?: string[]; // Missing fields, low confidence, etc.
}

// Upload batch tracking
export interface UploadBatch {
  id: string;
  createdAt: Date;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  status: 'uploading' | 'processing' | 'completed' | 'partial_failure' | 'failed';
  receiptIds: string[];
}

// Filter options for dashboard
export interface ReceiptFilters {
  category?: ExpenseCategory | 'すべて';
  status?: 'すべて' | '要確認' | '完了';
  dateRange?: {
    from: Date;
    to: Date;
  };
  searchQuery?: string;
}

// Upload queue tracking
export interface UploadQueueItem {
  id: string; // UUID for the queue item
  createdAt: Date;
  updatedAt: Date;

  // File metadata
  fileName: string;
  fileSize: number;
  mimeType: string;
  imageId: string; // Reference to stored image blob

  // Processing state
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;

  // Link to receipt once created
  receiptId?: string;
}
