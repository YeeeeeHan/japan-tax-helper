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
  // NTA Official Expense Categories (国税庁公式経費科目)
  // Reference: https://www.nta.go.jp/taxes/shiraberu/shinkoku/kojin_jigyo/index.htm
  | '租税公課' // Taxes and public charges (印紙税、登録免許税など)
  | '水道光熱費' // Utilities (電気、ガス、水道)
  | '旅費交通費' // Travel & transportation (タクシー、電車、出張費など)
  | '通信費' // Communication (携帯、電話、インターネットなど)
  | '修繕費' // Repairs (機器修理、メンテナンスなど)
  | '消耗品費' // Consumables (文具、事務用品、10万円未満の備品)
  | '雑費' // Miscellaneous expenses
  | '給料賃金' // Salaries & wages (従業員給与)
  | '外注工賃' // Outsourcing costs (業務委託費)
  | '減価償却費' // Depreciation (固定資産の償却)
  | '貸倒金' // Bad debts (回収不能債権)
  | '地代家賃' // Rent (事務所賃料など)
  | '利子割引料' // Interest & discounts (借入金利息など)
  | '交際費' // Entertainment (飲食、ギフトなど)
  | '接待交際費' // Entertainment expenses (接待費用)
  | '広告宣伝費' // Advertising (広告、マーケティング)
  | '福利厚生費' // Employee welfare (従業員福利厚生)
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
