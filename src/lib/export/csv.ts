import { encode } from 'iconv-lite';
import { saveAs } from 'file-saver';
import type { Receipt } from '@/types/receipt';
import { formatDate } from '../utils/format';
import type { Language } from '../i18n/translations';

/**
 * CSV column headers for e-Tax compatible bookkeeping export
 * Based on NTA 帳簿の様式例（事業所得者用）
 */
const CSV_HEADERS = {
  ja: {
    date: '日付',
    issuer: '取引先',
    description: '摘要',
    category: '勘定科目',
    subtotal: '税抜金額',
    tax8: '消費税(8%)',
    tax10: '消費税(10%)',
    total: '合計金額',
    tNumber: '登録番号',
    paymentMethod: '支払方法',
    notes: '備考',
  },
  en: {
    date: 'Date',
    issuer: 'Vendor',
    description: 'Description',
    category: 'Category',
    subtotal: 'Subtotal (excl. tax)',
    tax8: 'Tax (8%)',
    tax10: 'Tax (10%)',
    total: 'Total',
    tNumber: 'T-Number',
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
 * Convert receipt data to CSV row
 */
function receiptToCSVRow(receipt: Receipt): string[] {
  const data = receipt.extractedData;

  // Get tax amounts for 8% and 10%
  const tax8 = data.taxBreakdown.find((tb) => tb.taxRate === 8);
  const tax10 = data.taxBreakdown.find((tb) => tb.taxRate === 10);

  return [
    formatDate(data.transactionDate),
    data.issuerName,
    data.description,
    data.suggestedCategory,
    String(data.subtotalExcludingTax),
    String(tax8?.taxAmount || 0),
    String(tax10?.taxAmount || 0),
    String(data.totalAmount),
    data.tNumber || '',
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

  // Build header row
  const headerRow = [
    h.date,
    h.issuer,
    h.description,
    h.category,
    h.subtotal,
    h.tax8,
    h.tax10,
    h.total,
    h.tNumber,
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
 * @param receipts - Array of receipts to summarize
 * @param lang - Language for headers
 * @returns CSV content as string
 */
function generateSummaryCSVContent(receipts: Receipt[], lang: Language): string {
  const isJapanese = lang === 'ja';

  // Headers
  const headers = isJapanese
    ? ['勘定科目', '件数', '税抜金額', '消費税(8%)', '消費税(10%)', '合計金額']
    : ['Category', 'Count', 'Subtotal', 'Tax (8%)', 'Tax (10%)', 'Total'];

  // Group by category
  const categoryTotals: Record<
    string,
    { count: number; subtotal: number; tax8: number; tax10: number; total: number }
  > = {};

  receipts.forEach((receipt) => {
    const cat = receipt.extractedData.suggestedCategory;
    if (!categoryTotals[cat]) {
      categoryTotals[cat] = { count: 0, subtotal: 0, tax8: 0, tax10: 0, total: 0 };
    }

    categoryTotals[cat].count++;
    categoryTotals[cat].subtotal += receipt.extractedData.subtotalExcludingTax;
    categoryTotals[cat].total += receipt.extractedData.totalAmount;

    receipt.extractedData.taxBreakdown.forEach((tb) => {
      if (tb.taxRate === 8) {
        categoryTotals[cat].tax8 += tb.taxAmount;
      } else if (tb.taxRate === 10) {
        categoryTotals[cat].tax10 += tb.taxAmount;
      }
    });
  });

  // Build rows
  const rows: string[][] = [headers.map(escapeCSVField)];

  Object.entries(categoryTotals).forEach(([category, data]) => {
    rows.push([
      escapeCSVField(category),
      escapeCSVField(data.count),
      escapeCSVField(data.subtotal),
      escapeCSVField(data.tax8),
      escapeCSVField(data.tax10),
      escapeCSVField(data.total),
    ]);
  });

  // Add grand total row
  const grandTotal = Object.values(categoryTotals).reduce(
    (acc, data) => ({
      count: acc.count + data.count,
      subtotal: acc.subtotal + data.subtotal,
      tax8: acc.tax8 + data.tax8,
      tax10: acc.tax10 + data.tax10,
      total: acc.total + data.total,
    }),
    { count: 0, subtotal: 0, tax8: 0, tax10: 0, total: 0 }
  );

  rows.push([
    escapeCSVField(isJapanese ? '合計' : 'Total'),
    escapeCSVField(grandTotal.count),
    escapeCSVField(grandTotal.subtotal),
    escapeCSVField(grandTotal.tax8),
    escapeCSVField(grandTotal.tax10),
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
