import type { ExpenseCategory } from '@/types/receipt';
import type { LedgerRow } from '@/types/ledger';

/**
 * Maps Receipt ExpenseCategory to LedgerRow column name
 * Order matches NTA 青色申告決算書 (items 8-31)
 */
export const CATEGORY_TO_LEDGER_COLUMN: Record<ExpenseCategory, keyof LedgerRow> = {
  // NTA official categories (items 8-24, 31)
  '租税公課': 'taxes',            // 8
  '荷造運賃': 'packing',          // 9
  '水道光熱費': 'utilities',      // 10
  '旅費交通費': 'travel',         // 11
  '通信費': 'communication',      // 12
  '広告宣伝費': 'advertising',    // 13
  '接待交際費': 'entertainment',  // 14
  '損害保険料': 'insurance',      // 15
  '修繕費': 'repairs',            // 16
  '消耗品費': 'consumables',      // 17
  '減価償却費': 'depreciation',   // 18
  '福利厚生費': 'welfare',        // 19
  '給料賃金': 'salaries',         // 20
  '外注工賃': 'outsourcing',      // 21
  '利子割引料': 'interest',       // 22
  '地代家賃': 'rent',             // 23
  '貸倒金': 'badDebts',           // 24
  '雑費': 'misc',                 // 31

  // Aliases
  '交際費': 'entertainment',      // Maps to 接待交際費 (14)
  '未分類': 'misc',               // Uncategorized → Misc
};

/**
 * Reverse mapping: LedgerRow column → Japanese category name
 * Used for displaying column headers in Japanese
 */
export const LEDGER_COLUMN_TO_LABEL: Record<string, string> = {
  year: '年',
  month: '月',
  day: '日',
  description: '摘要',
  sales: '売上',
  purchases: '仕入',
  miscIncome: '雑収入等',
  taxes: '租税公課',
  packing: '荷造運賃',
  utilities: '水道光熱費',
  travel: '旅費交通費',
  communication: '通信費',
  advertising: '広告宣伝費',
  entertainment: '接待交際費',
  insurance: '損害保険料',
  repairs: '修繕費',
  consumables: '消耗品費',
  depreciation: '減価償却費',
  welfare: '福利厚生費',
  salaries: '給料賃金',
  outsourcing: '外注工賃',
  interest: '利子割引料',
  rent: '地代家賃',
  badDebts: '貸倒金',
  misc: '雑費',
};

/**
 * List of all expense category columns in display order
 * Matches NTA 青色申告決算書 order (items 8-24, 31)
 */
export const EXPENSE_COLUMNS_ORDER: (keyof LedgerRow)[] = [
  'taxes',          // 8  租税公課
  'packing',        // 9  荷造運賃
  'utilities',      // 10 水道光熱費
  'travel',         // 11 旅費交通費
  'communication',  // 12 通信費
  'advertising',    // 13 広告宣伝費
  'entertainment',  // 14 接待交際費
  'insurance',      // 15 損害保険料
  'repairs',        // 16 修繕費
  'consumables',    // 17 消耗品費
  'depreciation',   // 18 減価償却費
  'welfare',        // 19 福利厚生費
  'salaries',       // 20 給料賃金
  'outsourcing',    // 21 外注工賃
  'interest',       // 22 利子割引料
  'rent',           // 23 地代家賃
  'badDebts',       // 24 貸倒金
  'misc',           // 31 雑費
];

/**
 * Column widths for Excel export (in Excel units)
 */
export const LEDGER_COLUMN_WIDTHS = {
  year: 6,
  month: 4,
  day: 4,
  description: 30,
  // Income columns
  sales: 12,
  purchases: 12,
  miscIncome: 12,
  // Expense columns (all uniform)
  taxes: 11,
  packing: 11,
  utilities: 11,
  travel: 11,
  communication: 11,
  advertising: 11,
  entertainment: 11,
  insurance: 11,
  repairs: 11,
  consumables: 11,
  depreciation: 11,
  welfare: 11,
  salaries: 11,
  outsourcing: 11,
  interest: 11,
  rent: 11,
  badDebts: 11,
  misc: 11,
};
