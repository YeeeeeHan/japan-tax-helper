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
  // Order matches NTA 青色申告決算書 (items 8-31)
  taxes?: number;            // 租税公課 (8)
  packing?: number;          // 荷造運賃 (9)
  utilities?: number;        // 水道光熱費 (10)
  travel?: number;           // 旅費交通費 (11)
  communication?: number;    // 通信費 (12)
  advertising?: number;      // 広告宣伝費 (13)
  entertainment?: number;    // 接待交際費 (14)
  insurance?: number;        // 損害保険料 (15)
  repairs?: number;          // 修繕費 (16)
  consumables?: number;      // 消耗品費 (17)
  depreciation?: number;     // 減価償却費 (18)
  welfare?: number;          // 福利厚生費 (19)
  salaries?: number;         // 給料賃金 (20)
  outsourcing?: number;      // 外注工賃 (21)
  interest?: number;         // 利子割引料 (22)
  rent?: number;             // 地代家賃 (23)
  badDebts?: number;         // 貸倒金 (24)
  misc?: number;             // 雑費 (31)

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
  taxes?: number;
  packing?: number;
  utilities?: number;
  travel?: number;
  communication?: number;
  advertising?: number;
  entertainment?: number;
  insurance?: number;
  repairs?: number;
  consumables?: number;
  depreciation?: number;
  welfare?: number;
  salaries?: number;
  outsourcing?: number;
  interest?: number;
  rent?: number;
  badDebts?: number;
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
