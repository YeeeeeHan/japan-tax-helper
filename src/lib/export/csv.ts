import { encode } from 'iconv-lite';
import { saveAs } from 'file-saver';
import type { Receipt } from '@/types/receipt';
import { formatDate } from '../utils/format';
import type { Language } from '../i18n/translations';

/**
 * CSV column headers for e-Tax compatible bookkeeping export
 * Based on NTA 帳簿の様式例（事業所得者用）
 * Enhanced with detailed tax breakdown for Invoice System (適格請求書) compliance
 */
const CSV_HEADERS = {
  ja: {
    date: '日付',
    tNumber: '登録番号',
    issuer: '取引先',
    description: '摘要',
    category: '勘定科目',
    tax8Subtotal: '8%対象額',
    tax8Amount: '8%消費税額',
    tax8Total: '8%税込額',
    tax10Subtotal: '10%対象額',
    tax10Amount: '10%消費税額',
    tax10Total: '10%税込額',
    total: '合計金額',
    paymentMethod: '支払方法',
    notes: '備考',
  },
  en: {
    date: 'Date',
    tNumber: 'T-Number',
    issuer: 'Vendor',
    description: 'Description',
    category: 'Category',
    tax8Subtotal: '8% Subtotal',
    tax8Amount: '8% Tax Amount',
    tax8Total: '8% Total w/Tax',
    tax10Subtotal: '10% Subtotal',
    tax10Amount: '10% Tax Amount',
    tax10Total: '10% Total w/Tax',
    total: 'Total Amount',
    paymentMethod: 'Payment Method',
    notes: 'Notes',
  },
};

/**
 * Escape a CSV field value
 * - Wrap in quotes if contains comma, quote, or newline
 * - Double any existing quotes
 */
function escapeCSVField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // Check if field needs quoting
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    // Double any quotes and wrap in quotes
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Convert receipt data to CSV row with enhanced tax breakdown
 */
function receiptToCSVRow(receipt: Receipt): string[] {
  const data = receipt.extractedData;

  // Get tax amounts for 8% and 10%
  const tax8 = data.taxBreakdown.find((tb) => tb.taxRate === 8);
  const tax10 = data.taxBreakdown.find((tb) => tb.taxRate === 10);

  return [
    formatDate(data.transactionDate),
    data.tNumber || '',
    data.issuerName,
    data.description,
    data.suggestedCategory,
    String(tax8?.subtotal || 0),
    String(tax8?.taxAmount || 0),
    String(tax8?.total || 0),
    String(tax10?.subtotal || 0),
    String(tax10?.taxAmount || 0),
    String(tax10?.total || 0),
    String(data.totalAmount),
    data.paymentMethod || '',
    receipt.notes || '',
  ];
}

/**
 * Generate CSV content from receipts
 * @param receipts - Array of receipts to export
 * @param lang - Language for headers
 * @returns CSV content as string
 */
function generateCSVContent(receipts: Receipt[], lang: Language): string {
  const h = CSV_HEADERS[lang];

  // Build header row with enhanced tax breakdown columns
  const headerRow = [
    h.date,
    h.tNumber,
    h.issuer,
    h.description,
    h.category,
    h.tax8Subtotal,
    h.tax8Amount,
    h.tax8Total,
    h.tax10Subtotal,
    h.tax10Amount,
    h.tax10Total,
    h.total,
    h.paymentMethod,
    h.notes,
  ].map(escapeCSVField);

  // Build data rows
  const dataRows = receipts.map((receipt) =>
    receiptToCSVRow(receipt).map(escapeCSVField)
  );

  // Combine all rows
  const allRows = [headerRow, ...dataRows];

  // Join rows with CRLF (Windows line endings for e-Tax compatibility)
  // Per e-Tax spec: final field must have at least 1 character
  const csvLines = allRows.map((row) => {
    const line = row.join(',');
    // If the line ends with empty field (,,), add a space
    if (line.endsWith(',')) {
      return line + ' ';
    }
    return line;
  });

  return csvLines.join('\r\n');
}

/**
 * Export receipts to CSV file with SHIFT-JIS encoding
 * Compatible with Japanese e-Tax system requirements
 *
 * @param receipts - Array of receipts to export
 * @param lang - Language for column headers (default: 'ja')
 */
export async function exportToCSV(
  receipts: Receipt[],
  lang: Language = 'ja'
): Promise<void> {
  // Generate CSV content
  const csvContent = generateCSVContent(receipts, lang);

  // Encode to SHIFT-JIS for e-Tax compatibility
  // This is required because e-Tax system expects SHIFT-JIS encoding
  const shiftJISBuffer = encode(csvContent, 'Shift_JIS');

  // Create blob from buffer - convert to Uint8Array for compatibility
  const blob = new Blob([new Uint8Array(shiftJISBuffer)], {
    type: 'text/csv;charset=Shift_JIS',
  });

  // Generate filename with date
  const today = new Date().toISOString().split('T')[0];
  const filename = `領収書_${today}.csv`;

  // Trigger download
  saveAs(blob, filename);
}

/**
 * Generate CSV content for category summary export
 * Enhanced with detailed tax breakdown for Invoice System compliance
 * @param receipts - Array of receipts to summarize
 * @param lang - Language for headers
 * @returns CSV content as string
 */
function generateSummaryCSVContent(receipts: Receipt[], lang: Language): string {
  const isJapanese = lang === 'ja';

  // Headers with enhanced tax breakdown
  const headers = isJapanese
    ? ['勘定科目', '件数', '8%対象額', '8%消費税額', '8%税込額', '10%対象額', '10%消費税額', '10%税込額', '合計金額']
    : ['Category', 'Count', '8% Subtotal', '8% Tax', '8% Total', '10% Subtotal', '10% Tax', '10% Total', 'Total Amount'];

  // Group by category with detailed tax breakdown
  const categoryTotals: Record<
    string,
    { count: number; tax8Subtotal: number; tax8Amount: number; tax8Total: number; tax10Subtotal: number; tax10Amount: number; tax10Total: number; total: number }
  > = {};

  receipts.forEach((receipt) => {
    const cat = receipt.extractedData.suggestedCategory;
    if (!categoryTotals[cat]) {
      categoryTotals[cat] = { count: 0, tax8Subtotal: 0, tax8Amount: 0, tax8Total: 0, tax10Subtotal: 0, tax10Amount: 0, tax10Total: 0, total: 0 };
    }

    categoryTotals[cat].count++;
    categoryTotals[cat].total += receipt.extractedData.totalAmount;

    receipt.extractedData.taxBreakdown.forEach((tb) => {
      if (tb.taxRate === 8) {
        categoryTotals[cat].tax8Subtotal += tb.subtotal;
        categoryTotals[cat].tax8Amount += tb.taxAmount;
        categoryTotals[cat].tax8Total += tb.total;
      } else if (tb.taxRate === 10) {
        categoryTotals[cat].tax10Subtotal += tb.subtotal;
        categoryTotals[cat].tax10Amount += tb.taxAmount;
        categoryTotals[cat].tax10Total += tb.total;
      }
    });
  });

  // Build rows
  const rows: string[][] = [headers.map(escapeCSVField)];

  Object.entries(categoryTotals).forEach(([category, data]) => {
    rows.push([
      escapeCSVField(category),
      escapeCSVField(data.count),
      escapeCSVField(data.tax8Subtotal),
      escapeCSVField(data.tax8Amount),
      escapeCSVField(data.tax8Total),
      escapeCSVField(data.tax10Subtotal),
      escapeCSVField(data.tax10Amount),
      escapeCSVField(data.tax10Total),
      escapeCSVField(data.total),
    ]);
  });

  // Add grand total row
  const grandTotal = Object.values(categoryTotals).reduce(
    (acc, data) => ({
      count: acc.count + data.count,
      tax8Subtotal: acc.tax8Subtotal + data.tax8Subtotal,
      tax8Amount: acc.tax8Amount + data.tax8Amount,
      tax8Total: acc.tax8Total + data.tax8Total,
      tax10Subtotal: acc.tax10Subtotal + data.tax10Subtotal,
      tax10Amount: acc.tax10Amount + data.tax10Amount,
      tax10Total: acc.tax10Total + data.tax10Total,
      total: acc.total + data.total,
    }),
    { count: 0, tax8Subtotal: 0, tax8Amount: 0, tax8Total: 0, tax10Subtotal: 0, tax10Amount: 0, tax10Total: 0, total: 0 }
  );

  rows.push([
    escapeCSVField(isJapanese ? '合計' : 'Total'),
    escapeCSVField(grandTotal.count),
    escapeCSVField(grandTotal.tax8Subtotal),
    escapeCSVField(grandTotal.tax8Amount),
    escapeCSVField(grandTotal.tax8Total),
    escapeCSVField(grandTotal.tax10Subtotal),
    escapeCSVField(grandTotal.tax10Amount),
    escapeCSVField(grandTotal.tax10Total),
    escapeCSVField(grandTotal.total),
  ]);

  // Join with CRLF and handle final field
  const csvLines = rows.map((row) => {
    const line = row.join(',');
    if (line.endsWith(',')) {
      return line + ' ';
    }
    return line;
  });

  return csvLines.join('\r\n');
}

/**
 * Export category summary to CSV file with SHIFT-JIS encoding
 *
 * @param receipts - Array of receipts to summarize
 * @param lang - Language for column headers (default: 'ja')
 */
export async function exportSummaryToCSV(
  receipts: Receipt[],
  lang: Language = 'ja'
): Promise<void> {
  const csvContent = generateSummaryCSVContent(receipts, lang);
  const shiftJISBuffer = encode(csvContent, 'Shift_JIS');

  // Convert to Uint8Array for compatibility
  const blob = new Blob([new Uint8Array(shiftJISBuffer)], {
    type: 'text/csv;charset=Shift_JIS',
  });

  const today = new Date().toISOString().split('T')[0];
  const filename = `領収書_集計_${today}.csv`;

  saveAs(blob, filename);
}
