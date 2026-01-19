import type { ExpenseCategory } from '@/types/receipt';
import type { LedgerRow } from '@/types/ledger';

/**
 * Maps Receipt ExpenseCategory to LedgerRow column name
 * Based on kichou04.xlsx structure
 */
export const CATEGORY_TO_LEDGER_COLUMN: Record<ExpenseCategory, keyof LedgerRow> = {
  // Direct matches to NTA official categories
  '給料賃金': 'salaries',         // Column H
  '外注工賃': 'outsourcing',      // Column I
  '減価償却費': 'depreciation',   // Column J
  '貸倒金': 'badDebts',           // Column K
  '地代家賃': 'rent',             // Column L
  '利子割引料': 'interest',       // Column N
  '租税公課': 'taxes',            // Column O
  '水道光熱費': 'utilities',      // Column P
  '旅費交通費': 'travel',         // Column Q
  '通信費': 'communication',      // Column R
  '修繕費': 'repairs',            // Column S
  '消耗品費': 'consumables',      // Column T
  '雑費': 'misc',                 // Column U

  // Custom categories → Map to closest match or misc
  '交際費': 'misc',               // Entertainment → Misc (no dedicated column in template)
  '接待交際費': 'misc',           // Entertainment expenses → Misc
  '広告宣伝費': 'misc',           // Advertising → Misc
  '福利厚生費': 'misc',           // Employee welfare → Misc
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
  salaries: '給料賃金',
  outsourcing: '外注工賃',
  depreciation: '減価償却費',
  badDebts: '貸倒金',
  rent: '地代家賃',
  interest: '利子割引料',
  taxes: '租税公課',
  utilities: '水道光熱費',
  travel: '旅費交通費',
  communication: '通信費',
  repairs: '修繕費',
  consumables: '消耗品費',
  misc: '雑費',
};

/**
 * List of all expense category columns in display order
 * Matches kichou04.xlsx column order (G-U)
 */
export const EXPENSE_COLUMNS_ORDER: (keyof LedgerRow)[] = [
  'salaries',       // H
  'outsourcing',    // I
  'depreciation',   // J
  'badDebts',       // K
  'rent',           // L
  'interest',       // N
  'taxes',          // O
  'utilities',      // P
  'travel',         // Q
  'communication',  // R
  'repairs',        // S
  'consumables',    // T
  'misc',           // U
];

/**
 * Column widths for Excel export (in Excel units)
 * Based on kichou04.xlsx template
 */
export const LEDGER_COLUMN_WIDTHS = {
  year: 6,           // Narrow for "年"
  month: 4,          // Narrow for "月"
  day: 4,            // Narrow for "日"
  description: 30,   // Wide for transaction details
  // Income columns
  sales: 12,
  purchases: 12,
  miscIncome: 12,
  // Expense columns (all uniform)
  salaries: 11,
  outsourcing: 11,
  depreciation: 11,
  badDebts: 11,
  rent: 11,
  interest: 11,
  taxes: 11,
  utilities: 11,
  travel: 11,
  communication: 11,
  repairs: 11,
  consumables: 11,
  misc: 11,
};
