import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Receipt } from '@/types/receipt';
import { getImageBlob } from '../storage/images';
import { formatDate, formatCurrency } from '../utils/format';
import type { Language } from '../i18n/translations';
import { EQUIPMENT_THRESHOLD, DEPRECIATION_THRESHOLDS } from '../utils/constants';

/**
 * Column header translations for Excel export
 */
const EXPORT_HEADERS = {
  ja: {
    // Sheet names
    sheet_main: '領収書一覧',
    sheet_summary: '集計',
    sheet_flagged: '要確認',
    sheet_images: '領収書画像',
    sheet_depreciation: '減価償却対象',
    // Main sheet
    date: '日付',
    issuer: '発行者',
    tnumber: 'T番号',
    description: '内容',
    subtotal: '税抜金額',
    tax8: '消費税(8%)',
    tax10: '消費税(10%)',
    total: '合計金額',
    category: '分類',
    payment: '支払方法',
    notes: '備考',
    // Summary sheet
    count: '件数',
    grand_total: '合計',
    // Flagged sheet
    confidence: '信頼度',
    issues: '問題点',
    // Images sheet
    image: '画像',
    amount: '金額',
    no_image: '画像なし',
    // Depreciation sheet
    depreciation_method: '償却方法の提案',
    depreciation_note: '備考',
    depreciation_header_note: '※青色申告者は少額減価償却資産の特例が適用可能な場合があります',
    depreciation_immediate: '即時経費化可能（特例）',
    depreciation_lumpsum: '一括償却資産（3年均等）',
    depreciation_standard: '通常減価償却（耐用年数）',
    depreciation_register_required: '要：固定資産台帳への登録',
    // Issue messages
    issue_no_tnumber: 'T番号なし',
    issue_low_confidence: '信頼度低い',
    issue_amount_check: '金額要確認',
    issue_tnumber_check: 'T番号要確認',
  },
  en: {
    // Sheet names
    sheet_main: 'Receipts',
    sheet_summary: 'Summary',
    sheet_flagged: 'Flagged',
    sheet_images: 'Images',
    sheet_depreciation: 'Depreciation Assets',
    // Main sheet
    date: 'Date',
    issuer: 'Issuer',
    tnumber: 'T-Number',
    description: 'Description',
    subtotal: 'Subtotal (excl. tax)',
    tax8: 'Tax (8%)',
    tax10: 'Tax (10%)',
    total: 'Total',
    category: 'Category',
    payment: 'Payment',
    notes: 'Notes',
    // Summary sheet
    count: 'Count',
    grand_total: 'Total',
    // Flagged sheet
    confidence: 'Confidence',
    issues: 'Issues',
    // Images sheet
    image: 'Image',
    amount: 'Amount',
    no_image: 'No image',
    // Depreciation sheet
    depreciation_method: 'Suggested Method',
    depreciation_note: 'Notes',
    depreciation_header_note: '※Blue form filers may apply 少額減価償却資産の特例 (immediate expensing)',
    depreciation_immediate: 'Immediate expensing (special rule)',
    depreciation_lumpsum: 'Lump-sum depreciation (3 years)',
    depreciation_standard: 'Standard depreciation (useful life)',
    depreciation_register_required: 'Required: Fixed asset ledger',
    // Issue messages
    issue_no_tnumber: 'No T-Number',
    issue_low_confidence: 'Low confidence',
    issue_amount_check: 'Amount needs review',
    issue_tnumber_check: 'T-Number needs review',
  },
};

type ExportHeaders = typeof EXPORT_HEADERS.ja;

/**
 * Export receipts to Excel file with multiple sheets
 * @param receipts - Array of receipts to export
 * @param lang - Language for column headers (default: 'ja')
 */
export async function exportToExcel(receipts: Receipt[], lang: Language = 'ja'): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const h = EXPORT_HEADERS[lang];

  workbook.creator = 'Japanese Tax Helper';
  workbook.lastModifiedBy = 'Japanese Tax Helper';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Sheet 1: Main receipt data (領収書一覧)
  await createMainSheet(workbook, receipts, h);

  // Sheet 2: Summary by category (集計)
  await createSummarySheet(workbook, receipts, h);

  // Sheet 3: Flagged receipts (要確認)
  await createFlaggedSheet(workbook, receipts, h);

  // Sheet 4: Images (領収書画像)
  await createImagesSheet(workbook, receipts, h);

  // Sheet 5: Depreciation-eligible assets (減価償却対象)
  await createDepreciationSheet(workbook, receipts, h);

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const today = new Date().toISOString().split('T')[0];
  saveAs(blob, `領収書_${today}.xlsx`);
}

/**
 * Create main receipts sheet
 */
async function createMainSheet(workbook: ExcelJS.Workbook, receipts: Receipt[], h: ExportHeaders) {
  const sheet = workbook.addWorksheet(h.sheet_main);

  // Set column widths
  sheet.columns = [
    { header: h.date, key: 'date', width: 12 },
    { header: h.issuer, key: 'issuer', width: 25 },
    { header: h.tnumber, key: 'tnumber', width: 16 },
    { header: h.description, key: 'description', width: 30 },
    { header: h.subtotal, key: 'subtotal', width: 15 },
    { header: h.tax8, key: 'tax8', width: 12 },
    { header: h.tax10, key: 'tax10', width: 12 },
    { header: h.total, key: 'total', width: 12 },
    { header: h.category, key: 'category', width: 15 },
    { header: h.payment, key: 'payment', width: 12 },
    { header: h.notes, key: 'notes', width: 30 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data rows
  receipts.forEach((receipt) => {
    const tax8 = receipt.extractedData.taxBreakdown.find(tb => tb.taxRate === 8);
    const tax10 = receipt.extractedData.taxBreakdown.find(tb => tb.taxRate === 10);

    sheet.addRow({
      date: formatDate(receipt.extractedData.transactionDate),
      issuer: receipt.extractedData.issuerName,
      tnumber: receipt.extractedData.tNumber || '-',
      description: receipt.extractedData.description,
      subtotal: receipt.extractedData.subtotalExcludingTax,
      tax8: tax8?.taxAmount || 0,
      tax10: tax10?.taxAmount || 0,
      total: receipt.extractedData.totalAmount,
      category: receipt.extractedData.suggestedCategory,
      payment: receipt.extractedData.paymentMethod || '-',
      notes: receipt.notes || '',
    });
  });

  // Format currency columns
  ['subtotal', 'tax8', 'tax10', 'total'].forEach(key => {
    const col = sheet.getColumn(key);
    col.numFmt = '¥#,##0';
    col.alignment = { horizontal: 'right' };
  });

  // Add borders to all cells
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  // Freeze header row
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

/**
 * Create summary sheet grouped by category
 * Includes tax breakdown by rate (8% and 10%) for Japanese tax filing
 */
async function createSummarySheet(workbook: ExcelJS.Workbook, receipts: Receipt[], h: ExportHeaders) {
  const sheet = workbook.addWorksheet(h.sheet_summary);

  sheet.columns = [
    { header: h.category, key: 'category', width: 20 },
    { header: h.count, key: 'count', width: 10 },
    { header: h.subtotal, key: 'subtotal', width: 15 },
    { header: h.tax8, key: 'tax8', width: 14 },
    { header: h.tax10, key: 'tax10', width: 14 },
    { header: h.total, key: 'total', width: 15 },
  ];

  // Style header
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Group by category with tax breakdown
  const categoryTotals: Record<string, {
    count: number;
    subtotal: number;
    tax8: number;
    tax10: number;
    total: number;
  }> = {};

  receipts.forEach(receipt => {
    const cat = receipt.extractedData.suggestedCategory;
    if (!categoryTotals[cat]) {
      categoryTotals[cat] = { count: 0, subtotal: 0, tax8: 0, tax10: 0, total: 0 };
    }

    categoryTotals[cat].count++;
    categoryTotals[cat].subtotal += receipt.extractedData.subtotalExcludingTax;
    categoryTotals[cat].total += receipt.extractedData.totalAmount;

    // Sum up tax by rate
    receipt.extractedData.taxBreakdown.forEach(tb => {
      if (tb.taxRate === 8) {
        categoryTotals[cat].tax8 += tb.taxAmount;
      } else if (tb.taxRate === 10) {
        categoryTotals[cat].tax10 += tb.taxAmount;
      }
    });
  });

  // Add rows
  Object.entries(categoryTotals).forEach(([category, data]) => {
    sheet.addRow({
      category,
      count: data.count,
      subtotal: data.subtotal,
      tax8: data.tax8,
      tax10: data.tax10,
      total: data.total,
    });
  });

  // Calculate grand totals
  const grandTotals = receipts.reduce(
    (acc, r) => {
      acc.subtotal += r.extractedData.subtotalExcludingTax;
      acc.total += r.extractedData.totalAmount;
      r.extractedData.taxBreakdown.forEach(tb => {
        if (tb.taxRate === 8) acc.tax8 += tb.taxAmount;
        else if (tb.taxRate === 10) acc.tax10 += tb.taxAmount;
      });
      return acc;
    },
    { subtotal: 0, tax8: 0, tax10: 0, total: 0 }
  );

  // Add total row
  const totalRow = sheet.addRow({
    category: h.grand_total,
    count: receipts.length,
    subtotal: grandTotals.subtotal,
    tax8: grandTotals.tax8,
    tax10: grandTotals.tax10,
    total: grandTotals.total,
  });
  totalRow.font = { bold: true };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3F4F6' },
  };

  // Format currency columns
  ['subtotal', 'tax8', 'tax10', 'total'].forEach(key => {
    const col = sheet.getColumn(key);
    col.numFmt = '¥#,##0';
    col.alignment = { horizontal: 'right' };
  });

  // Add borders
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  // Freeze header row
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

/**
 * Create flagged receipts sheet
 * Shows receipts with compliance issues (missing T-Number, low confidence)
 * regardless of review status - for audit/compliance purposes
 */
async function createFlaggedSheet(workbook: ExcelJS.Workbook, receipts: Receipt[], h: ExportHeaders) {
  const sheet = workbook.addWorksheet(h.sheet_flagged);

  // Filter receipts that have any compliance issues (regardless of review status)
  const flaggedReceipts = receipts.filter(receipt => {
    const issues = getReceiptIssues(receipt, h);
    return issues.length > 0;
  });

  sheet.columns = [
    { header: h.date, key: 'date', width: 12 },
    { header: h.issuer, key: 'issuer', width: 25 },
    { header: h.tnumber, key: 'tnumber', width: 16 },
    { header: h.total, key: 'total', width: 12 },
    { header: h.confidence, key: 'confidence', width: 10 },
    { header: h.issues, key: 'issues', width: 40 },
  ];

  // Style header
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDC2626' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data
  flaggedReceipts.forEach(receipt => {
    const issues = getReceiptIssues(receipt, h);

    sheet.addRow({
      date: formatDate(receipt.extractedData.transactionDate),
      issuer: receipt.extractedData.issuerName,
      tnumber: receipt.extractedData.tNumber || '-',
      total: receipt.extractedData.totalAmount,
      confidence: `${((receipt.confidence?.overall ?? 0) * 100).toFixed(0)}%`,
      issues: issues.join(', '),
    });
  });

  // Format
  const totalCol = sheet.getColumn('total');
  totalCol.numFmt = '¥#,##0';
  totalCol.alignment = { horizontal: 'right' };

  // Add borders
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  // Freeze header row
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

/**
 * Get list of compliance issues for a receipt
 * Used for flagged sheet - identifies receipts that may need attention for tax compliance
 */
function getReceiptIssues(receipt: Receipt, h: ExportHeaders): string[] {
  const issues: string[] = [];

  // Missing T-Number (required for 適格請求書)
  // Check for null, undefined, empty string, or whitespace-only
  const tNumber = receipt.extractedData.tNumber;
  const hasTNumber = tNumber && tNumber.trim().length > 0;

  if (!hasTNumber) {
    issues.push(h.issue_no_tnumber);
  }

  // Low overall confidence
  const overallConfidence = receipt.confidence?.overall ?? 0;
  if (overallConfidence < 0.75) {
    issues.push(`${h.issue_low_confidence} (${(overallConfidence * 100).toFixed(0)}%)`);
  }

  // Critical field confidence issues
  const fields = receipt.confidence?.fields;
  if (fields) {
    if (fields.totalAmount < 0.8) {
      issues.push(h.issue_amount_check);
    }
    if (hasTNumber && fields.tNumber < 0.8) {
      issues.push(h.issue_tnumber_check);
    }
  }

  // User notes (manual flags)
  if (receipt.notes && receipt.notes.trim().length > 0) {
    issues.push(receipt.notes);
  }

  return issues;
}

/**
 * Create images sheet with embedded images
 */
async function createImagesSheet(workbook: ExcelJS.Workbook, receipts: Receipt[], h: ExportHeaders) {
  const sheet = workbook.addWorksheet(h.sheet_images);

  sheet.columns = [
    { header: h.image, key: 'image', width: 50 },
    { header: h.date, key: 'date', width: 12 },
    { header: h.issuer, key: 'issuer', width: 25 },
    { header: h.amount, key: 'total', width: 12 },
  ];

  // Style header (same as other sheets)
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 20;

  // Add header borders
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  let currentRow = 2; // Start from row 2 (after header)

  for (let i = 0; i < receipts.length; i++) {
    const receipt = receipts[i];

    // Get image blob
    const imageBlob = await getImageBlob(receipt.imageId);

    if (imageBlob) {
      try {
        // Convert blob to buffer
        const arrayBuffer = await imageBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Add image to workbook
        const imageId = workbook.addImage({
          buffer: buffer as any,
          extension: 'jpeg',
        });

        // Set row height for image (300px ≈ 225 points)
        const row = sheet.getRow(currentRow);
        row.height = 225;

        // Add image to cell
        sheet.addImage(imageId, {
          tl: { col: 0, row: currentRow - 1 }, // Top-left
          ext: { width: 300, height: 300 }, // 300x300px
        });

        // Add metadata next to image
        sheet.getCell(currentRow, 2).value = formatDate(receipt.extractedData.transactionDate);
        sheet.getCell(currentRow, 3).value = receipt.extractedData.issuerName;
        sheet.getCell(currentRow, 4).value = receipt.extractedData.totalAmount;
        sheet.getCell(currentRow, 4).numFmt = '¥#,##0';

        // Add borders to data cells
        for (let col = 1; col <= 4; col++) {
          sheet.getCell(currentRow, col).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        }

        currentRow++;
      } catch (error) {
        console.error('Error adding image:', error);
        // Add row with error indication
        sheet.getCell(currentRow, 1).value = h.no_image;
        sheet.getCell(currentRow, 2).value = formatDate(receipt.extractedData.transactionDate);
        sheet.getCell(currentRow, 3).value = receipt.extractedData.issuerName;
        sheet.getCell(currentRow, 4).value = receipt.extractedData.totalAmount;
        sheet.getCell(currentRow, 4).numFmt = '¥#,##0';

        for (let col = 1; col <= 4; col++) {
          sheet.getCell(currentRow, col).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        }
        currentRow++;
      }
    } else {
      // No image available
      sheet.getCell(currentRow, 1).value = h.no_image;
      sheet.getCell(currentRow, 2).value = formatDate(receipt.extractedData.transactionDate);
      sheet.getCell(currentRow, 3).value = receipt.extractedData.issuerName;
      sheet.getCell(currentRow, 4).value = receipt.extractedData.totalAmount;
      sheet.getCell(currentRow, 4).numFmt = '¥#,##0';

      for (let col = 1; col <= 4; col++) {
        sheet.getCell(currentRow, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
      currentRow++;
    }
  }

  // Freeze header row
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

/**
 * Create depreciation-eligible assets sheet
 * Lists items with totalAmount >= ¥100,000 that require depreciation treatment
 * Provides guidance on depreciation method based on amount and current tax rules
 */
async function createDepreciationSheet(workbook: ExcelJS.Workbook, receipts: Receipt[], h: ExportHeaders) {
  const sheet = workbook.addWorksheet(h.sheet_depreciation);

  // Filter high-value receipts (≥ ¥100,000)
  const highValueReceipts = receipts.filter(
    r => r.extractedData.totalAmount >= EQUIPMENT_THRESHOLD
  );

  sheet.columns = [
    { header: h.date, key: 'date', width: 12 },
    { header: h.issuer, key: 'issuer', width: 25 },
    { header: h.description, key: 'description', width: 30 },
    { header: h.total, key: 'total', width: 15 },
    { header: h.category, key: 'category', width: 15 },
    { header: h.depreciation_method, key: 'method', width: 28 },
    { header: h.depreciation_note, key: 'note', width: 30 },
  ];

  // Style header - purple to distinguish from other sheets
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF7C3AED' }, // Purple
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Helper to determine depreciation method suggestion
  const getDepreciationMethod = (amount: number): string => {
    const now = new Date();
    const thresholdChangeDate = new Date(DEPRECIATION_THRESHOLDS.THRESHOLD_CHANGE_DATE);

    // Determine current special rule limit
    const currentLimit = now < thresholdChangeDate
      ? DEPRECIATION_THRESHOLDS.IMMEDIATE_EXPENSE_LIMIT_CURRENT
      : DEPRECIATION_THRESHOLDS.IMMEDIATE_EXPENSE_LIMIT_FUTURE;

    if (amount <= currentLimit) {
      return h.depreciation_immediate;
    }

    if (amount <= 200000) {
      return h.depreciation_lumpsum;
    }

    return h.depreciation_standard;
  };

  // Add data rows
  highValueReceipts.forEach((receipt) => {
    const amount = receipt.extractedData.totalAmount;
    const now = new Date();
    const thresholdChangeDate = new Date(DEPRECIATION_THRESHOLDS.THRESHOLD_CHANGE_DATE);
    const currentLimit = now < thresholdChangeDate
      ? DEPRECIATION_THRESHOLDS.IMMEDIATE_EXPENSE_LIMIT_CURRENT
      : DEPRECIATION_THRESHOLDS.IMMEDIATE_EXPENSE_LIMIT_FUTURE;

    sheet.addRow({
      date: formatDate(receipt.extractedData.transactionDate),
      issuer: receipt.extractedData.issuerName,
      description: receipt.extractedData.description,
      total: amount,
      category: receipt.extractedData.suggestedCategory,
      method: getDepreciationMethod(amount),
      note: amount > currentLimit ? h.depreciation_register_required : '',
    });
  });

  // Format currency column
  const totalCol = sheet.getColumn('total');
  totalCol.numFmt = '¥#,##0';
  totalCol.alignment = { horizontal: 'right' };

  // Add summary row at bottom if there are high-value items
  if (highValueReceipts.length > 0) {
    const totalAmount = highValueReceipts.reduce(
      (sum, r) => sum + r.extractedData.totalAmount,
      0
    );

    // Add empty row
    sheet.addRow({});

    // Add total row
    const totalRow = sheet.addRow({
      date: '',
      issuer: '',
      description: h.grand_total,
      total: totalAmount,
      category: '',
      method: `${highValueReceipts.length}${h.count === '件数' ? '件' : ' items'}`,
      note: '',
    });
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    };
  }

  // Add note about threshold changes at bottom
  const noteRowNum = sheet.rowCount + 2;
  sheet.getCell(noteRowNum, 1).value = h.depreciation_header_note;
  sheet.getCell(noteRowNum, 1).font = { italic: true, color: { argb: 'FF6B7280' } };
  sheet.mergeCells(noteRowNum, 1, noteRowNum, 7);

  // Add borders to data cells (header + data rows, not the note)
  const dataRowCount = highValueReceipts.length + 1 + (highValueReceipts.length > 0 ? 2 : 0);
  for (let rowNum = 1; rowNum <= dataRowCount; rowNum++) {
    const row = sheet.getRow(rowNum);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  }

  // Freeze header row
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}
