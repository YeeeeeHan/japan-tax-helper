import { ExpenseCategory } from '@/types/receipt';

// Standard expense categories for Japanese tax filing
export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; description: string }[] = [
  {
    value: '旅費交通費',
    label: '旅費交通費',
    description: 'Travel and transportation expenses',
  },
  {
    value: '交際費',
    label: '交際費',
    description: 'Entertainment expenses',
  },
  {
    value: '消耗品費',
    label: '消耗品費',
    description: 'Consumables and supplies',
  },
  {
    value: '通信費',
    label: '通信費',
    description: 'Communication expenses',
  },
  {
    value: '水道光熱費',
    label: '水道光熱費',
    description: 'Utilities',
  },
  {
    value: '広告宣伝費',
    label: '広告宣伝費',
    description: 'Advertising expenses',
  },
  {
    value: '損害保険料',
    label: '損害保険料',
    description: 'Insurance premiums',
  },
  {
    value: '租税公課',
    label: '租税公課',
    description: 'Taxes and public dues',
  },
  {
    value: '地代家賃',
    label: '地代家賃',
    description: 'Rent',
  },
  {
    value: '外注費',
    label: '外注費',
    description: 'Outsourcing costs',
  },
  {
    value: '会議費',
    label: '会議費',
    description: 'Meeting expenses',
  },
  {
    value: '研修費',
    label: '研修費',
    description: 'Training expenses',
  },
  {
    value: '新聞図書費',
    label: '新聞図書費',
    description: 'Books and subscriptions',
  },
  {
    value: '未分類',
    label: '未分類',
    description: 'Uncategorized',
  },
];

// Japanese consumption tax rates
export const TAX_RATES = {
  STANDARD: 10, // 標準税率
  REDUCED: 8,   // 軽減税率 (food, newspapers, etc.)
} as const;

// Confidence thresholds
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.9,
  MEDIUM: 0.75,
  LOW: 0.6,
  FLAG_FOR_REVIEW: 0.75, // Flag if overall confidence is below this
  CRITICAL_FIELD: 0.8,   // Flag if critical fields (T-number, amount) are below this
} as const;

// File upload constraints
export const UPLOAD_CONSTRAINTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ACCEPTED_FORMATS: ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'application/pdf'],
  ACCEPTED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.heic', '.pdf'],
  MAX_BATCH_SIZE: 100, // Maximum files in one batch
} as const;

// Image compression settings
export const IMAGE_COMPRESSION = {
  MAX_DIMENSION: 2048, // Max width/height in pixels
  QUALITY: 0.85,       // JPEG quality (0-1)
  FORMAT: 'image/jpeg',
} as const;

// Processing queue settings
export const QUEUE_SETTINGS = {
  CONCURRENCY: 5,      // Process 5 receipts at a time
  RETRY_ATTEMPTS: 3,   // Max retry attempts for failed requests
  RETRY_DELAY: 1000,   // Initial retry delay in ms
} as const;

// IndexedDB settings
export const DB_NAME = 'JapanTaxHelper';
export const DB_VERSION = 1;

// Storage quota warning threshold
export const STORAGE_WARNING_THRESHOLD = 0.8; // Warn at 80% capacity
