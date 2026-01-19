import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Receipt } from '@/types/receipt';
import type { Language } from '../i18n/translations';
import type { LedgerRow, LedgerSubtotal } from '@/types/ledger';
import { transformReceiptsToLedger } from './ledger-transform';
import { LEDGER_COLUMN_TO_LABEL, LEDGER_COLUMN_WIDTHS, EXPENSE_COLUMNS_ORDER } from './ledger-mapping';

/**
 * Excel formatting constants for NTA ledger export
 * Based on kichou04.xlsx template analysis
 */
const LEDGER_EXCEL_FORMAT = {
  // Sheet settings
  SHEET_NAME: '１項',

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
      horizontal: 'center' as const,
      vertical: 'middle' as const,
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
      horizontal: 'center' as const,
      vertical: 'middle' as const,
      wrapText: true,
    },
    fill: {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FFE0E0E0' }, // Light gray
    },
    border: {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const },
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
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const },
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
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FFF0F0F0' }, // Very light gray
    },
    border: {
      top: { style: 'medium' as const },
      bottom: { style: 'medium' as const },
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
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FFD0D0D0' }, // Medium gray
    },
    border: {
      top: { style: 'double' as const },
      bottom: { style: 'double' as const },
    },
  },

  // Number format for currency (Japanese Yen)
  NUMBER_FORMAT: {
    currency: '¥#,##0',
    integer: '#,##0',
  },

  // Column alignment
  ALIGNMENT: {
    date: 'center' as const,
    description: 'left' as const,
    amount: 'right' as const,
  },
};

/**
 * Export receipts to Excel in NTA ledger format (帳簿の様式例)
 *
 * @param receipts - Array of receipts to export
 * @param lang - Language for interface (currently only 'ja' supported)
 * @returns Promise that resolves when export is complete
 */
export async function exportToLedgerExcel(receipts: Receipt[], lang: Language = 'ja'): Promise<void> {
  // Transform receipts to ledger structure
  const ledgerData = transformReceiptsToLedger(receipts);

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Japanese Tax Helper';
  workbook.lastModifiedBy = 'Japanese Tax Helper';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Create main ledger sheet
  const sheet = workbook.addWorksheet(LEDGER_EXCEL_FORMAT.SHEET_NAME);

  // Set up columns
  setupColumns(sheet);

  // Add title row
  addTitleRow(sheet);

  // Add header rows
  addHeaderRows(sheet);

  // Add data rows with subtotals
  addDataRows(sheet, ledgerData.ledger.rows, ledgerData.ledger.dailySubtotals, ledgerData.ledger.monthlySubtotals);

  // Add grand total
  addGrandTotal(sheet, ledgerData.ledger.grandTotal);

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const today = new Date().toISOString().split('T')[0];
  saveAs(blob, `帳簿_${today}.xlsx`);
}

/**
 * Set up column widths and basic properties
 */
function setupColumns(sheet: ExcelJS.Worksheet): void {
  // Column configuration: A=year, B=month, C=day, D=description, E-U=amounts
  const columns = [
    { key: 'year', width: LEDGER_COLUMN_WIDTHS.year },
    { key: 'month', width: LEDGER_COLUMN_WIDTHS.month },
    { key: 'day', width: LEDGER_COLUMN_WIDTHS.day },
    { key: 'description', width: LEDGER_COLUMN_WIDTHS.description },
    { key: 'sales', width: LEDGER_COLUMN_WIDTHS.sales },
    { key: 'purchases', width: LEDGER_COLUMN_WIDTHS.purchases },
    { key: 'miscIncome', width: LEDGER_COLUMN_WIDTHS.miscIncome },
    ...EXPENSE_COLUMNS_ORDER.map(col => ({
      key: col,
      width: LEDGER_COLUMN_WIDTHS[col as keyof typeof LEDGER_COLUMN_WIDTHS],
    })),
  ];

  sheet.columns = columns;
}

/**
 * Add title row (row 2)
 */
function addTitleRow(sheet: ExcelJS.Worksheet): void {
  const titleCell = sheet.getCell(LEDGER_EXCEL_FORMAT.TITLE.row, 1);
  titleCell.value = LEDGER_EXCEL_FORMAT.TITLE.text;
  titleCell.font = LEDGER_EXCEL_FORMAT.TITLE.font;
  titleCell.alignment = LEDGER_EXCEL_FORMAT.TITLE.alignment;

  // Merge cells A2:U2
  sheet.mergeCells(LEDGER_EXCEL_FORMAT.TITLE.mergeRange);

  // Set row height
  sheet.getRow(LEDGER_EXCEL_FORMAT.TITLE.row).height = 30;
}

/**
 * Add header rows (rows 3-6)
 * Multi-level headers matching kichou04.xlsx
 */
function addHeaderRows(sheet: ExcelJS.Worksheet): void {
  const startRow = LEDGER_EXCEL_FORMAT.HEADER.startRow;

  // Row 3: Main headers
  sheet.getCell(startRow, 1).value = LEDGER_COLUMN_TO_LABEL.year;
  sheet.getCell(startRow, 2).value = LEDGER_COLUMN_TO_LABEL.month;
  sheet.getCell(startRow, 3).value = LEDGER_COLUMN_TO_LABEL.day;
  sheet.getCell(startRow, 4).value = LEDGER_COLUMN_TO_LABEL.description;
  sheet.getCell(startRow, 5).value = LEDGER_COLUMN_TO_LABEL.sales;
  sheet.getCell(startRow, 6).value = LEDGER_COLUMN_TO_LABEL.purchases;
  sheet.getCell(startRow, 7).value = LEDGER_COLUMN_TO_LABEL.miscIncome;

  // Expense category headers (columns H-U)
  let col = 8;
  for (const expenseCol of EXPENSE_COLUMNS_ORDER) {
    sheet.getCell(startRow, col).value = LEDGER_COLUMN_TO_LABEL[expenseCol as keyof typeof LEDGER_COLUMN_TO_LABEL];
    col++;
  }

  // Apply header styling to all header cells
  for (let row = startRow; row <= LEDGER_EXCEL_FORMAT.HEADER.endRow; row++) {
    for (let colNum = 1; colNum <= 21; colNum++) {
      const cell = sheet.getCell(row, colNum);
      cell.font = LEDGER_EXCEL_FORMAT.HEADER.font;
      cell.alignment = LEDGER_EXCEL_FORMAT.HEADER.alignment;
      cell.fill = LEDGER_EXCEL_FORMAT.HEADER.fill;
      cell.border = LEDGER_EXCEL_FORMAT.HEADER.border;
    }
  }

  // Merge date columns vertically (rows 3-6)
  sheet.mergeCells(3, 1, 6, 1); // Year column
  sheet.mergeCells(3, 2, 6, 2); // Month column
  sheet.mergeCells(3, 3, 6, 3); // Day column
  sheet.mergeCells(3, 4, 6, 4); // Description column

  // Merge amount columns vertically (rows 3-6)
  for (let colNum = 5; colNum <= 21; colNum++) {
    sheet.mergeCells(3, colNum, 6, colNum);
  }
}

/**
 * Add data rows with daily and monthly subtotals
 */
function addDataRows(
  sheet: ExcelJS.Worksheet,
  rows: LedgerRow[],
  dailySubtotals: Map<string, LedgerSubtotal>,
  monthlySubtotals: Map<string, LedgerSubtotal>
): void {
  let currentRow = LEDGER_EXCEL_FORMAT.DATA_ROW.startRow;
  let currentDate = '';
  let currentMonth = '';

  for (const row of rows) {
    const dateKey = formatDateKey(row.date);
    const monthKey = formatMonthKey(row.date);

    // Add data row
    addSingleDataRow(sheet, currentRow, row);
    currentRow++;

    // Check if we need to add daily subtotal
    const isLastRowOfDay =
      rows.findIndex(r => formatDateKey(r.date) === dateKey) ===
      rows.lastIndexOf(rows.find(r => formatDateKey(r.date) === dateKey)!);

    if (isLastRowOfDay && dailySubtotals.has(dateKey)) {
      const subtotal = dailySubtotals.get(dateKey)!;
      addSubtotalRow(sheet, currentRow, subtotal, 'daily');
      currentRow++;
    }

    // Check if we need to add monthly subtotal
    const isLastRowOfMonth =
      rows.findIndex(r => formatMonthKey(r.date) === monthKey) ===
      rows.lastIndexOf(rows.find(r => formatMonthKey(r.date) === monthKey)!);

    if (isLastRowOfMonth && monthlySubtotals.has(monthKey) && isLastRowOfDay) {
      const subtotal = monthlySubtotals.get(monthKey)!;
      addSubtotalRow(sheet, currentRow, subtotal, 'monthly');
      currentRow++;
    }
  }
}

/**
 * Add a single data row
 */
function addSingleDataRow(sheet: ExcelJS.Worksheet, rowNum: number, data: LedgerRow): void {
  const excelRow = sheet.getRow(rowNum);

  // Date columns
  excelRow.getCell(1).value = data.year;
  excelRow.getCell(2).value = data.month;
  excelRow.getCell(3).value = data.day;

  // Description
  excelRow.getCell(4).value = data.description;

  // Income columns
  excelRow.getCell(5).value = data.sales || null;
  excelRow.getCell(6).value = data.purchases || null;
  excelRow.getCell(7).value = data.miscIncome || null;

  // Expense columns (H-U, Excel columns 8-21)
  let col = 8;
  for (const expenseCol of EXPENSE_COLUMNS_ORDER) {
    excelRow.getCell(col).value = data[expenseCol] || null;
    col++;
  }

  // Apply styling
  excelRow.font = LEDGER_EXCEL_FORMAT.DATA_ROW.font;
  excelRow.height = LEDGER_EXCEL_FORMAT.DATA_ROW.height;

  // Apply alignment
  excelRow.getCell(1).alignment = { horizontal: LEDGER_EXCEL_FORMAT.ALIGNMENT.date };
  excelRow.getCell(2).alignment = { horizontal: LEDGER_EXCEL_FORMAT.ALIGNMENT.date };
  excelRow.getCell(3).alignment = { horizontal: LEDGER_EXCEL_FORMAT.ALIGNMENT.date };
  excelRow.getCell(4).alignment = { horizontal: LEDGER_EXCEL_FORMAT.ALIGNMENT.description };

  // Apply number format and alignment to amount columns
  for (let colNum = 5; colNum <= 21; colNum++) {
    const cell = excelRow.getCell(colNum);
    cell.numFmt = LEDGER_EXCEL_FORMAT.NUMBER_FORMAT.currency;
    cell.alignment = { horizontal: LEDGER_EXCEL_FORMAT.ALIGNMENT.amount };
  }

  // Apply borders to all cells
  excelRow.eachCell((cell) => {
    cell.border = LEDGER_EXCEL_FORMAT.DATA_ROW.border;
  });
}

/**
 * Add subtotal row (daily or monthly)
 */
function addSubtotalRow(
  sheet: ExcelJS.Worksheet,
  rowNum: number,
  subtotal: LedgerSubtotal,
  type: 'daily' | 'monthly'
): void {
  const excelRow = sheet.getRow(rowNum);

  // Merge date columns and show label
  excelRow.getCell(1).value = subtotal.label;
  sheet.mergeCells(rowNum, 1, rowNum, 4);

  // Income columns
  excelRow.getCell(5).value = subtotal.sales || null;
  excelRow.getCell(6).value = subtotal.purchases || null;
  excelRow.getCell(7).value = subtotal.miscIncome || null;

  // Expense columns
  let col = 8;
  for (const expenseCol of EXPENSE_COLUMNS_ORDER) {
    excelRow.getCell(col).value = (subtotal as any)[expenseCol] || null;
    col++;
  }

  // Apply styling
  excelRow.font = LEDGER_EXCEL_FORMAT.SUBTOTAL_ROW.font;
  excelRow.fill = LEDGER_EXCEL_FORMAT.SUBTOTAL_ROW.fill;

  // Apply number format to amount columns
  for (let colNum = 5; colNum <= 21; colNum++) {
    const cell = excelRow.getCell(colNum);
    cell.numFmt = LEDGER_EXCEL_FORMAT.NUMBER_FORMAT.currency;
    cell.alignment = { horizontal: LEDGER_EXCEL_FORMAT.ALIGNMENT.amount };
  }

  // Apply borders
  excelRow.eachCell((cell) => {
    cell.border = {
      top: LEDGER_EXCEL_FORMAT.SUBTOTAL_ROW.border.top,
      bottom: LEDGER_EXCEL_FORMAT.SUBTOTAL_ROW.border.bottom,
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
}

/**
 * Add grand total row at the bottom
 */
function addGrandTotal(sheet: ExcelJS.Worksheet, grandTotal: LedgerSubtotal): void {
  const rowNum = sheet.rowCount + 1;
  const excelRow = sheet.getRow(rowNum);

  // Merge date columns and show label
  excelRow.getCell(1).value = grandTotal.label;
  sheet.mergeCells(rowNum, 1, rowNum, 4);

  // Income columns
  excelRow.getCell(5).value = grandTotal.sales || null;
  excelRow.getCell(6).value = grandTotal.purchases || null;
  excelRow.getCell(7).value = grandTotal.miscIncome || null;

  // Expense columns
  let col = 8;
  for (const expenseCol of EXPENSE_COLUMNS_ORDER) {
    excelRow.getCell(col).value = (grandTotal as any)[expenseCol] || null;
    col++;
  }

  // Apply styling
  excelRow.font = LEDGER_EXCEL_FORMAT.GRAND_TOTAL_ROW.font;
  excelRow.fill = LEDGER_EXCEL_FORMAT.GRAND_TOTAL_ROW.fill;

  // Apply number format to amount columns
  for (let colNum = 5; colNum <= 21; colNum++) {
    const cell = excelRow.getCell(colNum);
    cell.numFmt = LEDGER_EXCEL_FORMAT.NUMBER_FORMAT.currency;
    cell.alignment = { horizontal: LEDGER_EXCEL_FORMAT.ALIGNMENT.amount };
  }

  // Apply borders
  excelRow.eachCell((cell) => {
    cell.border = {
      top: LEDGER_EXCEL_FORMAT.GRAND_TOTAL_ROW.border.top,
      bottom: LEDGER_EXCEL_FORMAT.GRAND_TOTAL_ROW.border.bottom,
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
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
