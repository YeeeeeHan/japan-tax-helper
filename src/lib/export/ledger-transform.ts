import type { Receipt } from '@/types/receipt';
import type { LedgerRow, LedgerSubtotal, LedgerSheet, LedgerExport } from '@/types/ledger';
import { CATEGORY_TO_LEDGER_COLUMN, EXPENSE_COLUMNS_ORDER } from './ledger-mapping';

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
    (row as any)[categoryColumn] = extractedData.totalAmount;
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
  groupedByDate.forEach((dateRows, dateKey) => {
    const date = dateRows[0].date;
    const subtotal = aggregateRows(dateRows, {
      label: `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 小計`,
      from: date,
      to: date,
    });
    subtotals.set(dateKey, subtotal);
  });

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
  groupedByMonth.forEach((monthRows, monthKey) => {
    const firstDate = monthRows[0].date;
    const lastDate = monthRows[monthRows.length - 1].date;

    const subtotal = aggregateRows(monthRows, {
      label: `${firstDate.getFullYear()}年${firstDate.getMonth() + 1}月 合計`,
      from: firstDate,
      to: lastDate,
    });
    subtotals.set(monthKey, subtotal);
  });

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
    const expenseFields: (keyof LedgerRow)[] = EXPENSE_COLUMNS_ORDER;

    for (const field of expenseFields) {
      const value = row[field];
      if (typeof value === 'number') {
        (subtotal as any)[field] = ((subtotal as any)[field] || 0) + value;
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
