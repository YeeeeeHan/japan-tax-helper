import { ExpenseCategory } from '@/types/receipt';

// NTA Official Expense Categories (国税庁公式経費科目)
// Reference: https://www.nta.go.jp/taxes/shiraberu/shinkoku/kojin_jigyo/index.htm
// Ordered by frequency of use for individual business owners (個人事業主)
export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; description: string }[] = [
  // High-frequency categories for professionals
  { value: '旅費交通費', label: '旅費交通費', description: 'Travel & transportation' },
  { value: '通信費', label: '通信費', description: 'Communication' },
  { value: '消耗品費', label: '消耗品費', description: 'Consumables' },
  { value: '交際費', label: '交際費', description: 'Entertainment' },
  { value: '接待交際費', label: '接待交際費', description: 'Entertainment expenses' },
  { value: '地代家賃', label: '地代家賃', description: 'Rent' },
  { value: '広告宣伝費', label: '広告宣伝費', description: 'Advertising' },
  { value: '外注工賃', label: '外注工賃', description: 'Outsourcing costs' },
  // Standard NTA categories
  { value: '租税公課', label: '租税公課', description: 'Taxes and public charges' },
  { value: '荷造運賃', label: '荷造運賃', description: 'Packing & shipping' },
  { value: '水道光熱費', label: '水道光熱費', description: 'Utilities' },
  { value: '損害保険料', label: '損害保険料', description: 'Insurance premiums' },
  { value: '修繕費', label: '修繕費', description: 'Repairs' },
  { value: '給料賃金', label: '給料賃金', description: 'Salaries & wages' },
  { value: '減価償却費', label: '減価償却費', description: 'Depreciation' },
  { value: '貸倒金', label: '貸倒金', description: 'Bad debts' },
  { value: '利子割引料', label: '利子割引料', description: 'Interest & discounts' },
  { value: '福利厚生費', label: '福利厚生費', description: 'Employee welfare' },
  { value: '雑費', label: '雑費', description: 'Miscellaneous' },
  // Default
  { value: '未分類', label: '未分類', description: 'Uncategorized' },
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

// High-value asset threshold (for depreciation consideration)
// Items ≥¥100,000 may require depreciation treatment as fixed assets (固定資産)
export const EQUIPMENT_THRESHOLD = 100000; // ¥100,000

// Depreciation thresholds for 少額減価償却資産の特例
// Blue Form (青色申告) filers can expense items under these limits immediately
export const DEPRECIATION_THRESHOLDS = {
  // Until March 2026
  IMMEDIATE_EXPENSE_LIMIT_CURRENT: 300000, // ¥300,000
  // After April 2026 (per 令和8年度税制改正)
  IMMEDIATE_EXPENSE_LIMIT_FUTURE: 400000, // ¥400,000
  // Cutoff date for threshold change
  THRESHOLD_CHANGE_DATE: '2026-04-01',
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

// Parallel processing settings (based on Gemini API tier)
export const PROCESSING_SETTINGS = {
  CONCURRENCY: {
    FREE_TIER: 2,  // Safe for 5 RPM (Gemini free tier)
    PAID_TIER: 5,  // Safe for 150 RPM (Gemini paid tier)
  },
  STAGGER_DELAY_MS: 200, // Delay between starting each concurrent request (prevents thundering herd)
  SEQUENTIAL_DELAY_MS: 500, // Delay between requests in sequential mode
} as const;

// IndexedDB settings
export const DB_NAME = 'JapanTaxHelper';
export const DB_VERSION = 1;

// Storage quota warning threshold
export const STORAGE_WARNING_THRESHOLD = 0.8; // Warn at 80% capacity
