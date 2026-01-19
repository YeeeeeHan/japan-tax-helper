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
