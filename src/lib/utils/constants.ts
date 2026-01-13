import { ExpenseCategory } from '@/types/receipt';

// Standard expense categories for Japanese tax filing
// Organized in 3 tiers based on frequency of use
export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; description: string }[] = [
  // Tier 1: Essential Categories (必須カテゴリ) - covers ~90% of receipts
  { value: '旅費交通費', label: '旅費交通費', description: 'Travel & Transportation' },
  { value: '通信費', label: '通信費', description: 'Communication Expenses' },
  { value: '消耗品費', label: '消耗品費', description: 'Office Supplies' },
  { value: '新聞図書費', label: '新聞図書費', description: 'Books & Subscriptions' },
  { value: '研修費', label: '研修費', description: 'Training & Education' },
  { value: '支払手数料', label: '支払手数料', description: 'Professional & Association Fees' },
  { value: '交際費', label: '交際費', description: 'Entertainment Expenses' },
  { value: '会議費', label: '会議費', description: 'Meeting Expenses' },
  // Tier 2: Secondary Categories (準必須カテゴリ)
  { value: '外注費', label: '外注費', description: 'Outsourcing Fees' },
  { value: '広告宣伝費', label: '広告宣伝費', description: 'Advertising & Marketing' },
  { value: '地代家賃', label: '地代家賃', description: 'Rent' },
  { value: '水道光熱費', label: '水道光熱費', description: 'Utilities' },
  { value: '修繕費', label: '修繕費', description: 'Repairs & Maintenance' },
  { value: '保険料', label: '保険料', description: 'Insurance Premiums' },
  { value: '租税公課', label: '租税公課', description: 'Taxes & Public Dues' },
  { value: '雑費', label: '雑費', description: 'Miscellaneous Expenses' },
  // Tier 3: High-Value Items (減価償却関連) - items ≥¥100,000
  { value: '工具器具備品', label: '工具器具備品', description: 'Office Equipment' },
  { value: '減価償却費', label: '減価償却費', description: 'Depreciation Expense' },
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

// Equipment expense threshold (for 工具器具備品 classification)
// Items ≥¥100,000 must be treated as fixed assets requiring depreciation
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
