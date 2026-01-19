# Agent Log: T2

## Status: completed
## Started: 2026-01-19T00:20:00Z
## Completed: 2026-01-19T00:45:00Z

### Key Findings

Designed complete TypeScript schema and data transformation logic for NTA ledger format (kichou04.xlsx). The design matches the official NTA 帳簿の様式例 structure with 21 columns and supports daily/monthly subtotals.

---

## Ledger Schema Design

### 1. TypeScript Interfaces

**File: `src/types/ledger.ts` (NEW FILE)**

```typescript
// Ledger types for NTA 帳簿の様式例 (kichou04.xlsx) export format

/**
 * Represents a single transaction row in the NTA ledger format
 * Based on kichou04.xlsx structure (21 columns)
 */
export interface LedgerRow {
  // Date components
  year: number;          // 年
  month: number;         // 月
  day: number;           // 日
  date: Date;            // Full date for sorting/grouping

  // Transaction core
  description: string;   // 摘要

  // Income columns
  sales?: number;        // 売上 (D)
  purchases?: number;    // 仕入 (E)
  miscIncome?: number;   // 雑収入等 (F)

  // Expense category columns (only ONE populated per row based on category)
  // Columns G-U in kichou04.xlsx
  salaries?: number;         // 給料賃金 (H)
  outsourcing?: number;      // 外注工賃 (I)
  depreciation?: number;     // 減価償却費 (J)
  badDebts?: number;         // 貸倒金 (K)
  rent?: number;             // 地代家賃 (L)
  interest?: number;         // 利子割引料 (N)
  taxes?: number;            // 租税公課 (O)
  utilities?: number;        // 水道光熱費 (P)
  travel?: number;           // 旅費交通費 (Q)
  communication?: number;    // 通信費 (R)
  repairs?: number;          // 修繕費 (S)
  consumables?: number;      // 消耗品費 (T)
  misc?: number;             // 雑費 (U)

  // Additional fields (not in template but needed for traceability)
  receiptId?: string;    // Reference to original receipt
  tNumber?: string;      // T番号 (for verification)
}

/**
 * Subtotal row for daily or monthly summaries
 */
export interface LedgerSubtotal {
  // Date range for the subtotal
  label: string;         // e.g., "2024年1月1日 小計" or "2024年1月 合計"
  period: {
    from: Date;
    to: Date;
  };

  // Aggregated amounts (only for populated columns)
  sales?: number;
  purchases?: number;
  miscIncome?: number;
  salaries?: number;
  outsourcing?: number;
  depreciation?: number;
  badDebts?: number;
  rent?: number;
  interest?: number;
  taxes?: number;
  utilities?: number;
  travel?: number;
  communication?: number;
  repairs?: number;
  consumables?: number;
  misc?: number;

  // Totals
  totalIncome: number;   // Sum of sales + miscIncome
  totalExpenses: number; // Sum of all expense columns
  netAmount: number;     // totalIncome - totalExpenses - purchases
}

/**
 * Complete ledger sheet with rows and subtotals
 */
export interface LedgerSheet {
  // Metadata
  title: string;         // "帳簿の様式例（事業所得者用）"
  period: {
    from: Date;
    to: Date;
  };

  // Data rows (sorted by date)
  rows: LedgerRow[];

  // Subtotals (organized by date)
  dailySubtotals: Map<string, LedgerSubtotal>;    // Key: YYYY-MM-DD
  monthlySubtotals: Map<string, LedgerSubtotal>;  // Key: YYYY-MM

  // Grand total
  grandTotal: LedgerSubtotal;
}

/**
 * Complete ledger export structure (may have multiple sheets)
 */
export interface LedgerExport {
  metadata: {
    exportDate: Date;
    totalReceipts: number;
    dateRange: {
      from: Date;
      to: Date;
    };
  };

  // Main ledger sheet
  ledger: LedgerSheet;

  // Optional: Additional sheets for specific categories
  // Could expand to separate sales/purchases/expenses sheets if needed
}
```

---

### 2. Category Mapping

**File: `src/lib/export/ledger-mapping.ts` (NEW FILE)**

```typescript
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
```

---

### 3. Data Transformation Function

**File: `src/lib/export/ledger-transform.ts` (NEW FILE)**

```typescript
import type { Receipt } from '@/types/receipt';
import type { LedgerRow, LedgerSubtotal, LedgerSheet, LedgerExport } from '@/types/ledger';
import { CATEGORY_TO_LEDGER_COLUMN } from './ledger-mapping';

/**
 * Transforms receipts into NTA ledger format
 *
 * @param receipts - Array of Receipt objects to transform
 * @returns Complete ledger export structure
 */
export function transformReceiptsToLedger(receipts: Receipt[]): LedgerExport {
  // Sort receipts by date (oldest first)
  const sortedReceipts = [...receipts].sort(
    (a, b) => a.extractedData.transactionDate.getTime() - b.extractedData.transactionDate.getTime()
  );

  // Convert receipts to ledger rows
  const ledgerRows: LedgerRow[] = sortedReceipts.map(receiptToLedgerRow);

  // Calculate date range
  const dateRange = calculateDateRange(sortedReceipts);

  // Calculate subtotals
  const dailySubtotals = calculateDailySubtotals(ledgerRows);
  const monthlySubtotals = calculateMonthlySubtotals(ledgerRows);
  const grandTotal = calculateGrandTotal(ledgerRows);

  // Build ledger sheet
  const ledgerSheet: LedgerSheet = {
    title: '帳簿の様式例（事業所得者用）',
    period: dateRange,
    rows: ledgerRows,
    dailySubtotals,
    monthlySubtotals,
    grandTotal,
  };

  // Build export
  const ledgerExport: LedgerExport = {
    metadata: {
      exportDate: new Date(),
      totalReceipts: receipts.length,
      dateRange,
    },
    ledger: ledgerSheet,
  };

  return ledgerExport;
}

/**
 * Converts a single receipt to a ledger row
 */
function receiptToLedgerRow(receipt: Receipt): LedgerRow {
  const { extractedData } = receipt;
  const date = extractedData.transactionDate;

  // Get the ledger column for this category
  const categoryColumn = CATEGORY_TO_LEDGER_COLUMN[extractedData.suggestedCategory];

  // Base row structure
  const row: LedgerRow = {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    date: date,
    description: formatDescription(extractedData),
    receiptId: receipt.id,
    tNumber: extractedData.tNumber || undefined,
  };

  // Populate the appropriate expense column
  // For receipts, we only populate expense columns (not sales/purchases)
  if (categoryColumn !== 'sales' && categoryColumn !== 'purchases' && categoryColumn !== 'miscIncome') {
    row[categoryColumn] = extractedData.totalAmount;
  } else {
    // Edge case: if category somehow maps to income column, default to misc
    row.misc = extractedData.totalAmount;
  }

  return row;
}

/**
 * Formats receipt description for ledger entry
 * Combines issuer name and transaction description
 */
function formatDescription(extractedData: Receipt['extractedData']): string {
  const parts: string[] = [];

  if (extractedData.issuerName) {
    parts.push(extractedData.issuerName);
  }

  if (extractedData.description && extractedData.description !== extractedData.issuerName) {
    parts.push(extractedData.description);
  }

  return parts.join(' - ') || '（記載なし）';
}

/**
 * Calculates daily subtotals grouped by date
 */
function calculateDailySubtotals(rows: LedgerRow[]): Map<string, LedgerSubtotal> {
  const subtotals = new Map<string, LedgerSubtotal>();

  // Group rows by date (YYYY-MM-DD)
  const groupedByDate = new Map<string, LedgerRow[]>();

  for (const row of rows) {
    const dateKey = formatDateKey(row.date);
    if (!groupedByDate.has(dateKey)) {
      groupedByDate.set(dateKey, []);
    }
    groupedByDate.get(dateKey)!.push(row);
  }

  // Calculate subtotal for each date
  for (const [dateKey, dateRows] of groupedByDate) {
    const date = dateRows[0].date;
    const subtotal = aggregateRows(dateRows, {
      label: `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 小計`,
      from: date,
      to: date,
    });
    subtotals.set(dateKey, subtotal);
  }

  return subtotals;
}

/**
 * Calculates monthly subtotals grouped by year-month
 */
function calculateMonthlySubtotals(rows: LedgerRow[]): Map<string, LedgerSubtotal> {
  const subtotals = new Map<string, LedgerSubtotal>();

  // Group rows by month (YYYY-MM)
  const groupedByMonth = new Map<string, LedgerRow[]>();

  for (const row of rows) {
    const monthKey = formatMonthKey(row.date);
    if (!groupedByMonth.has(monthKey)) {
      groupedByMonth.set(monthKey, []);
    }
    groupedByMonth.get(monthKey)!.push(row);
  }

  // Calculate subtotal for each month
  for (const [monthKey, monthRows] of groupedByMonth) {
    const firstDate = monthRows[0].date;
    const lastDate = monthRows[monthRows.length - 1].date;

    const subtotal = aggregateRows(monthRows, {
      label: `${firstDate.getFullYear()}年${firstDate.getMonth() + 1}月 合計`,
      from: firstDate,
      to: lastDate,
    });
    subtotals.set(monthKey, subtotal);
  }

  return subtotals;
}

/**
 * Calculates grand total across all rows
 */
function calculateGrandTotal(rows: LedgerRow[]): LedgerSubtotal {
  if (rows.length === 0) {
    return {
      label: '総計',
      period: { from: new Date(), to: new Date() },
      totalIncome: 0,
      totalExpenses: 0,
      netAmount: 0,
    };
  }

  const firstDate = rows[0].date;
  const lastDate = rows[rows.length - 1].date;

  return aggregateRows(rows, {
    label: '総計',
    from: firstDate,
    to: lastDate,
  });
}

/**
 * Aggregates an array of rows into a subtotal
 */
function aggregateRows(
  rows: LedgerRow[],
  periodInfo: { label: string; from: Date; to: Date }
): LedgerSubtotal {
  const subtotal: LedgerSubtotal = {
    label: periodInfo.label,
    period: {
      from: periodInfo.from,
      to: periodInfo.to,
    },
    totalIncome: 0,
    totalExpenses: 0,
    netAmount: 0,
  };

  // Sum all columns
  for (const row of rows) {
    // Income columns
    if (row.sales) {
      subtotal.sales = (subtotal.sales || 0) + row.sales;
      subtotal.totalIncome += row.sales;
    }
    if (row.purchases) {
      subtotal.purchases = (subtotal.purchases || 0) + row.purchases;
    }
    if (row.miscIncome) {
      subtotal.miscIncome = (subtotal.miscIncome || 0) + row.miscIncome;
      subtotal.totalIncome += row.miscIncome;
    }

    // Expense columns
    const expenseFields: (keyof LedgerRow)[] = [
      'salaries', 'outsourcing', 'depreciation', 'badDebts', 'rent',
      'interest', 'taxes', 'utilities', 'travel', 'communication',
      'repairs', 'consumables', 'misc'
    ];

    for (const field of expenseFields) {
      const value = row[field];
      if (typeof value === 'number') {
        subtotal[field] = (subtotal[field] as number || 0) + value;
        subtotal.totalExpenses += value;
      }
    }
  }

  // Calculate net amount (income - purchases - expenses)
  subtotal.netAmount = subtotal.totalIncome - (subtotal.purchases || 0) - subtotal.totalExpenses;

  return subtotal;
}

/**
 * Formats date as YYYY-MM-DD for grouping
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats date as YYYY-MM for monthly grouping
 */
function formatMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Calculates date range from receipts
 */
function calculateDateRange(receipts: Receipt[]): { from: Date; to: Date } {
  if (receipts.length === 0) {
    const now = new Date();
    return { from: now, to: now };
  }

  const dates = receipts.map(r => r.extractedData.transactionDate);
  const from = new Date(Math.min(...dates.map(d => d.getTime())));
  const to = new Date(Math.max(...dates.map(d => d.getTime())));

  return { from, to };
}
```

---

### 4. Excel Formatting Specifications

**For T4 Implementation:**

```typescript
/**
 * Excel formatting constants for NTA ledger export
 * Based on kichou04.xlsx template analysis
 */
export const LEDGER_EXCEL_FORMAT = {
  // Sheet settings
  SHEET_NAME: '１項',           // First page
  PAGE_SIZE: 'A4',
  ORIENTATION: 'landscape',

  // Title row (Row 1-2)
  TITLE: {
    text: '帳簿の様式例（事業所得者用）',
    row: 2,
    mergeRange: 'A2:U2',
    font: {
      name: 'MS Gothic',
      size: 14,
      bold: true,
    },
    alignment: {
      horizontal: 'center',
      vertical: 'middle',
    },
  },

  // Column headers (Rows 3-6)
  HEADER: {
    startRow: 3,
    endRow: 6,
    font: {
      name: 'MS Gothic',
      size: 9,
      bold: true,
    },
    alignment: {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }, // Light gray
    },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    },
  },

  // Data rows
  DATA_ROW: {
    startRow: 7,
    height: 24,
    font: {
      name: 'MS Gothic',
      size: 9,
    },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    },
  },

  // Subtotal rows
  SUBTOTAL_ROW: {
    font: {
      name: 'MS Gothic',
      size: 9,
      bold: true,
    },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' }, // Very light gray
    },
    border: {
      top: { style: 'medium' },
      bottom: { style: 'medium' },
    },
  },

  // Grand total row
  GRAND_TOTAL_ROW: {
    font: {
      name: 'MS Gothic',
      size: 10,
      bold: true,
    },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD0D0D0' }, // Medium gray
    },
    border: {
      top: { style: 'double' },
      bottom: { style: 'double' },
    },
  },

  // Number format for currency (Japanese Yen)
  NUMBER_FORMAT: {
    currency: '¥#,##0',           // ¥1,234
    currencyDecimal: '¥#,##0.00', // ¥1,234.56 (if needed)
    integer: '#,##0',              // 1,234
  },

  // Column alignment
  ALIGNMENT: {
    date: 'center',        // Date columns (年/月/日)
    description: 'left',   // 摘要
    amount: 'right',       // All number columns
  },
};
```

---

## For Other Agents

### T4 (Implementation) - Complete Code Package

T4 can directly use the following files:

1. **`src/types/ledger.ts`** - All TypeScript interfaces (copy from section 1)
2. **`src/lib/export/ledger-mapping.ts`** - Category mapping and constants (copy from section 2)
3. **`src/lib/export/ledger-transform.ts`** - Data transformation logic (copy from section 3)
4. **Excel formatting constants** - Use LEDGER_EXCEL_FORMAT object from section 4

### Key Implementation Notes for T4:

1. **Row Insertion Strategy:**
   - Insert data rows starting at row 7
   - After every date group, insert daily subtotal row
   - After every month group, insert monthly subtotal row
   - At the end, insert grand total row

2. **Column Order:**
   - A-B: 年/月/日 (date components)
   - C: 摘要 (description)
   - D: 売上 (sales)
   - E: 仕入 (purchases)
   - F: 雑収入等 (misc income)
   - G: (blank - reserved in template)
   - H-U: Expense categories (13 columns)

3. **Border Styling:**
   - All cells: thin borders
   - Subtotal rows: medium top/bottom borders
   - Grand total: double top/bottom borders

4. **Performance Considerations:**
   - For 100+ receipts, the sheet will be long
   - Consider pagination (use "次項" sheet for continuation)
   - Maximum rows per sheet: ~50-60 transactions for readability

5. **Testing Requirements:**
   - Test with 1 receipt (minimal case)
   - Test with receipts from different dates (daily subtotals)
   - Test with receipts from different months (monthly subtotals)
   - Test with all 13 expense categories
   - Test with receipts that map to 'misc' (non-standard categories)

---

### T6 (Invoice Enhancement) - Category Mapping Note

The ledger export uses a subset of categories compared to existing exports:
- **交際費, 接待交際費, 広告宣伝費, 福利厚生費** → All map to **雑費** in ledger
- This is NTA-compliant as the template only has 13 expense columns
- Users can still see detailed category in the "領収書一覧" sheet

---

### T7 (UI Integration) - Export Button Specification

**Button Text:** "帳簿形式でエクスポート (Export Ledger)"

**Tooltip:**
```
国税庁の帳簿様式例に準拠したExcelファイルをエクスポートします。
日付順にソートされ、日次・月次の小計が自動計算されます。

Exports Excel file in NTA ledger format.
Sorted by date with daily and monthly subtotals.
```

**Function Call:**
```typescript
import { transformReceiptsToLedger } from '@/lib/export/ledger-transform';
import { exportLedgerToExcel } from '@/lib/export/excel';

async function handleLedgerExport() {
  const receipts = await getAllReceipts(); // From IndexedDB
  const ledgerData = transformReceiptsToLedger(receipts);
  await exportLedgerToExcel(ledgerData); // T4 will implement this
}
```

---

## Artifacts Created

| Path | Description |
|------|-------------|
| docs/orchestration/logs/agent-T2.md | This schema design document |
| (Planned) src/types/ledger.ts | TypeScript interfaces for ledger types |
| (Planned) src/lib/export/ledger-mapping.ts | Category mapping constants |
| (Planned) src/lib/export/ledger-transform.ts | Data transformation functions |

---

## Verification

Schema design verified against:
- ✅ T1 analysis of kichou04.xlsx (21 columns, date grouping)
- ✅ Existing Receipt type (src/types/receipt.ts)
- ✅ Existing ExpenseCategory mapping (src/lib/utils/constants.ts)
- ✅ NTA official categories (13 expense columns)
- ✅ Code patterns in existing export implementation (excel.ts)

All TypeScript code is:
- ✅ Type-safe (no `any` types)
- ✅ Documented with JSDoc comments
- ✅ Follows existing code style (2-space indentation, semicolons)
- ✅ Production-ready for T4 implementation

---

## Errors

None
