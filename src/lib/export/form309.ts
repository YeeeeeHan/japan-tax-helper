import { encode } from 'iconv-lite';
import { saveAs } from 'file-saver';
import type { Receipt } from '@/types/receipt';
import type {
  Form309Submitter,
  Form309PaymentRecord,
  Form309Export,
  Form309ValidationResult,
} from '@/types/form309';

/**
 * Calculate withholding tax for professional fees (報酬・料金)
 *
 * Tax rates per NTA guidelines:
 * - Amount ≤ ¥1,000,000: 10.21% of total amount
 * - Amount > ¥1,000,000: ¥102,100 + 20.42% of amount exceeding ¥1,000,000
 *
 * Note: 10.21% = 10% income tax + 0.21% reconstruction special tax
 *       20.42% = 20% income tax + 0.42% reconstruction special tax
 *
 * @param amount Payment amount before withholding
 * @returns Withholding tax amount (rounded down to nearest yen)
 */
export function calculateWithholdingTax(amount: number): number {
  const THRESHOLD = 1_000_000; // ¥1,000,000
  const RATE_LOW = 0.1021; // 10.21%
  const RATE_HIGH = 0.2042; // 20.42%

  if (amount <= THRESHOLD) {
    // Simple calculation for amounts ≤ ¥1M
    return Math.floor(amount * RATE_LOW);
  } else {
    // Progressive calculation for amounts > ¥1M
    const baseTax = Math.floor(THRESHOLD * RATE_LOW); // ¥102,100
    const excessAmount = amount - THRESHOLD;
    const excessTax = Math.floor(excessAmount * RATE_HIGH);
    return baseTax + excessTax;
  }
}

/**
 * Convert full-width (全角) characters to half-width (半角)
 * Used for numbers, alphanumeric codes, phone numbers
 *
 * @param str Input string (may contain full-width characters)
 * @returns String with half-width characters
 */
export function toHalfWidth(str: string): string {
  return str
    .replace(/[！-～]/g, (char) => {
      // Full-width range: U+FF01 to U+FF5E
      // Half-width range: U+0021 to U+007E
      const code = char.charCodeAt(0);
      return String.fromCharCode(code - 0xfee0);
    })
    .replace(/　/g, ' '); // Replace full-width space with half-width space
}

/**
 * Convert half-width (半角) characters to full-width (全角)
 * Used for Japanese text, names, addresses in official forms
 *
 * @param str Input string (may contain half-width characters)
 * @returns String with full-width characters
 */
export function toFullWidth(str: string): string {
  return str
    .replace(/[!-~]/g, (char) => {
      // Half-width range: U+0021 to U+007E
      // Full-width range: U+FF01 to U+FF5E
      const code = char.charCodeAt(0);
      return String.fromCharCode(code + 0xfee0);
    })
    .replace(/ /g, '　'); // Replace half-width space with full-width space
}

/**
 * Validate character type (half-width or full-width)
 *
 * @param str Input string
 * @param type Expected character type
 * @returns True if all characters match expected type
 */
export function validateCharacterType(
  str: string,
  type: 'half' | 'full'
): boolean {
  if (type === 'half') {
    // Check if string contains only half-width characters (ASCII range)
    return /^[\x20-\x7E]*$/.test(str);
  } else {
    // Check if string contains full-width characters
    // Full-width range: U+FF01 to U+FF5E and Japanese characters
    return /^[^\x20-\x7E]*$/.test(str);
  }
}

/**
 * Validate field length
 *
 * @param str Input string
 * @param maxLength Maximum allowed length
 * @returns True if string length is within limit
 */
export function validateFieldLength(str: string, maxLength: number): boolean {
  return str.length <= maxLength;
}

/**
 * Format tax year for Form 309
 * Converts full year to 2-digit format (e.g., 2024 → "06", 2025 → "07")
 *
 * Note: Japanese tax year is Reiwa era based
 * - 2024 = Reiwa 6 (R6) → "06"
 * - 2025 = Reiwa 7 (R7) → "07"
 *
 * @param year Full year (e.g., 2024, 2025)
 * @returns Two-digit tax year string
 */
export function formatTaxYear(year: number): string {
  // Reiwa era started in 2019 (Reiwa 1)
  const REIWA_START = 2019;
  const reiwaYear = year - REIWA_START + 1;
  return reiwaYear.toString().padStart(2, '0');
}

/**
 * Transform receipt data to Form 309 payment record
 *
 * Note: This transformation flips the perspective from expense tracking to payment reporting:
 * - Receipt issuer → Payment recipient
 * - Receipt amount → Payment amount
 * - Receipt description → Payment description
 *
 * @param receipt Receipt data (from expense tracking)
 * @returns Form 309 payment record
 */
export function transformReceiptToForm309(
  receipt: Receipt
): Form309PaymentRecord {
  const { extractedData } = receipt;

  // Calculate withholding tax based on payment amount
  const withholdingTax = calculateWithholdingTax(extractedData.totalAmount);

  return {
    recipientName: extractedData.issuerName,
    recipientAddress: extractedData.issuerAddress,
    recipientTNumber: extractedData.tNumber || undefined,
    paymentAmount: extractedData.totalAmount,
    withholdingTax,
    paymentDate: extractedData.transactionDate,
    paymentDescription: extractedData.description,
    paymentCategory: extractedData.suggestedCategory,
  };
}

/**
 * Aggregate receipts into Form 309 payment records
 * Groups receipts by recipient (issuer) and sums payments
 *
 * @param receipts Array of receipts
 * @returns Array of aggregated payment records
 */
export function aggregatePaymentRecords(
  receipts: Receipt[]
): Form309PaymentRecord[] {
  // Group receipts by recipient name
  const receiptsByRecipient = receipts.reduce(
    (groups, receipt) => {
      const recipientName = receipt.extractedData.issuerName;
      if (!groups[recipientName]) {
        groups[recipientName] = [];
      }
      groups[recipientName].push(receipt);
      return groups;
    },
    {} as Record<string, Receipt[]>
  );

  // Aggregate payments for each recipient
  return Object.entries(receiptsByRecipient).map(
    ([recipientName, receipts]) => {
      const totalPayment = receipts.reduce(
        (sum, r) => sum + r.extractedData.totalAmount,
        0
      );

      const withholdingTax = calculateWithholdingTax(totalPayment);

      // Use data from the most recent receipt for address/T-number
      const latestReceipt = receipts.reduce((latest, r) =>
        r.extractedData.transactionDate > latest.extractedData.transactionDate
          ? r
          : latest
      );

      return {
        recipientName,
        recipientAddress: latestReceipt.extractedData.issuerAddress,
        recipientTNumber: latestReceipt.extractedData.tNumber || undefined,
        paymentAmount: totalPayment,
        withholdingTax,
        paymentDate: latestReceipt.extractedData.transactionDate,
        paymentDescription: `${receipts.length}件の支払`,
        paymentCategory: latestReceipt.extractedData.suggestedCategory,
      };
    }
  );
}

/**
 * Validate Form 309 submitter information
 *
 * @param submitter Form 309 submitter data
 * @returns Validation result
 */
export function validateForm309Submitter(
  submitter: Form309Submitter
): Form309ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Document type must be "309"
  if (submitter.documentType !== '309') {
    errors.push('Document type must be "309"');
  }

  // Reference number must be half-width, max 10 chars
  if (!validateCharacterType(submitter.referenceNumber1, 'half')) {
    errors.push('Reference number must be half-width characters');
  }
  if (!validateFieldLength(submitter.referenceNumber1, 10)) {
    errors.push('Reference number must be 10 characters or less');
  }

  // Branch code (if provided) must be half-width, max 5 chars
  if (submitter.branchCode) {
    if (!validateCharacterType(submitter.branchCode, 'half')) {
      errors.push('Branch code must be half-width characters');
    }
    if (!validateFieldLength(submitter.branchCode, 5)) {
      errors.push('Branch code must be 5 characters or less');
    }
  }

  // Address must be full-width, max 60 chars
  if (!validateFieldLength(submitter.submitterAddress, 60)) {
    errors.push('Submitter address must be 60 characters or less');
  }

  // Name must be full-width, max 30 chars
  if (!validateFieldLength(submitter.submitterName, 30)) {
    errors.push('Submitter name must be 30 characters or less');
  }

  // Phone must be half-width, max 15 chars
  if (!validateCharacterType(submitter.submitterPhone, 'half')) {
    errors.push('Phone number must be half-width characters');
  }
  if (!validateFieldLength(submitter.submitterPhone, 15)) {
    errors.push('Phone number must be 15 characters or less');
  }

  // Tax year must be 2 half-width digits
  if (!validateCharacterType(submitter.taxYear, 'half')) {
    errors.push('Tax year must be half-width characters');
  }
  if (submitter.taxYear.length !== 2) {
    errors.push('Tax year must be exactly 2 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate Form 309 payment record
 *
 * @param record Payment record data
 * @returns Validation result
 */
export function validateForm309PaymentRecord(
  record: Form309PaymentRecord
): Form309ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Recipient name is required
  if (!record.recipientName || record.recipientName.trim() === '') {
    errors.push('Recipient name is required');
  }

  // Payment amount must be positive
  if (record.paymentAmount <= 0) {
    errors.push('Payment amount must be greater than 0');
  }

  // Withholding tax must be non-negative
  if (record.withholdingTax < 0) {
    errors.push('Withholding tax cannot be negative');
  }

  // Validate T-Number format if provided
  if (record.recipientTNumber) {
    const tNumberRegex = /^T\d{13}$/;
    if (!tNumberRegex.test(record.recipientTNumber)) {
      errors.push('Invalid T-Number format (must be T followed by 13 digits)');
    }
  } else {
    warnings.push(
      "T-Number is missing - may affect recipient's tax deduction"
    );
  }

  // Verify withholding tax calculation
  const expectedWithholding = calculateWithholdingTax(record.paymentAmount);
  if (Math.abs(record.withholdingTax - expectedWithholding) > 1) {
    warnings.push(
      `Withholding tax mismatch: expected ¥${expectedWithholding}, got ¥${record.withholdingTax}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate complete Form 309 export data
 *
 * @param exportData Form 309 export data
 * @returns Validation result
 */
export function validateForm309Export(
  exportData: Form309Export
): Form309ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate submitter
  const submitterValidation = validateForm309Submitter(exportData.submitter);
  errors.push(...submitterValidation.errors);
  warnings.push(...submitterValidation.warnings);

  // Validate each payment record
  exportData.paymentRecords.forEach((record, index) => {
    const recordValidation = validateForm309PaymentRecord(record);

    // Prefix errors with record index for clarity
    recordValidation.errors.forEach((error) => {
      errors.push(`Record ${index + 1}: ${error}`);
    });

    recordValidation.warnings.forEach((warning) => {
      warnings.push(`Record ${index + 1}: ${warning}`);
    });
  });

  // Validate metadata consistency
  if (exportData.paymentRecords.length !== exportData.metadata.recordCount) {
    errors.push('Record count mismatch in metadata');
  }

  // Verify total calculations
  const calculatedTotal = exportData.paymentRecords.reduce(
    (sum, r) => sum + r.paymentAmount,
    0
  );
  if (Math.abs(calculatedTotal - exportData.totalPayments) > 1) {
    errors.push('Total payments calculation mismatch');
  }

  const calculatedWithholding = exportData.paymentRecords.reduce(
    (sum, r) => sum + r.withholdingTax,
    0
  );
  if (Math.abs(calculatedWithholding - exportData.totalWithholdingTax) > 1) {
    errors.push('Total withholding tax calculation mismatch');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * CSV field length limits for Form 309
 * Used for validation before export
 */
export const FORM309_FIELD_LIMITS = {
  referenceNumber1: 10,
  branchCode: 5,
  submitterAddress: 60,
  submitterName: 30,
  submitterPhone: 15,
  taxYear: 2,
  recipientAddress: 60,
  recipientName: 30,
  recipientTNumber: 14, // T + 13 digits
  remarks: 120,
} as const;

/**
 * Generate CSV row for Form 309 payment record
 * Follows exact e-Tax column order (137 columns)
 *
 * @param submitter Form 309 submitter information
 * @param record Payment record
 * @param sequence Row sequence number
 * @returns Array of 137 field values in correct order
 */
export function generateForm309CSVRow(
  submitter: Form309Submitter,
  record: Form309PaymentRecord,
  sequence: number
): string[] {
  // Initialize all 137 columns as empty strings
  const row: string[] = new Array(137).fill('');

  // Parse phone number into 3 parts (e.g., "03-1234-5678" → ["03", "1234", "5678"])
  const phoneParts = submitter.submitterPhone.split('-').map(toHalfWidth);

  // Columns A-K: Submitter Information
  row[0] = toHalfWidth('309'); // A: Document type
  row[1] = toHalfWidth(sequence.toString()); // B: Sequence
  row[2] = toHalfWidth(submitter.referenceNumber1); // C: Reference number 1
  row[3] = toFullWidth(submitter.submitterAddress); // D: Address
  row[4] = toFullWidth(submitter.submitterName); // E: Name
  row[5] = phoneParts[0] || ''; // F: Phone part 1
  row[6] = phoneParts[1] || ''; // G: Phone part 2
  row[7] = phoneParts[2] || ''; // H: Phone part 3
  row[8] = toHalfWidth(submitter.branchCode || ''); // I: Branch code
  row[9] = toHalfWidth(submitter.correctionIndicator || ''); // J: Correction
  row[10] = toHalfWidth(submitter.taxYear); // K: Tax year

  // Columns L-O: Recipient Information
  row[11] = '1'; // L: Recipient category (1 = individual)
  row[12] = ''; // M: Recipient number (optional)
  row[13] = toFullWidth(record.recipientAddress || ''); // N: Recipient address
  row[14] = toFullWidth(record.recipientName); // O: Recipient name

  // Columns P-U: Payment Amount
  row[15] = toHalfWidth(record.paymentAmount.toString()); // P: Payment amount
  row[16] = ''; // Q-U: Reserved for specific payment categories
  row[17] = '';
  row[18] = '';
  row[19] = '';
  row[20] = '';

  // Columns V-AL: Detailed Categories (skip - rows 21-37 remain empty)

  // Columns AM-AO: Withholding Tax (positions 38-40)
  row[38] = toHalfWidth(record.withholdingTax.toString()); // AM: Withholding tax
  row[39] = ''; // AN-AO: Reserved
  row[40] = '';

  // Columns AP-BG: Additional fields (skip - rows 41-58 remain empty)

  // Columns BH-BK: T-Number (positions 59-62)
  if (record.recipientTNumber) {
    row[59] = '1'; // BH: T-Number flag
    row[60] = toHalfWidth(record.recipientTNumber); // BI: T-Number
  } else {
    row[59] = '';
    row[60] = '';
  }
  row[61] = ''; // BJ: T-Number part 2 (not used)
  row[62] = ''; // BK: T-Number part 3 (not used)

  // Column BL: Remarks (position 63)
  row[63] = toFullWidth(record.paymentDescription); // BL: Payment description

  // Remaining columns (64-136) remain empty for basic implementation

  return row;
}

/**
 * Generate complete Form 309 CSV export
 *
 * @param exportData Form 309 export data
 * @returns CSV string with CRLF line endings and SHIFT-JIS encoding ready
 */
export function generateForm309CSV(exportData: Form309Export): string {
  const rows: string[] = [];

  // Generate CSV rows for each payment record
  exportData.paymentRecords.forEach((record, index) => {
    const csvRow = generateForm309CSVRow(
      exportData.submitter,
      record,
      index + 1 // Sequence starts at 1
    );

    // Join with comma separator
    const rowString = csvRow.join(',');

    // Ensure last field has at least 1 character (e-Tax requirement)
    const finalRow = rowString.endsWith(',') ? rowString + ' ' : rowString;

    rows.push(finalRow);
  });

  // Join rows with CRLF (Windows line endings required by e-Tax)
  return rows.join('\r\n');
}

/**
 * Export receipts to Form 309 CSV file with SHIFT-JIS encoding
 * Compatible with Japanese e-Tax system requirements
 *
 * @param receipts Array of receipts to export
 * @param submitter Form 309 submitter information
 * @param taxYear Tax year (e.g., "06" for Reiwa 6/2024)
 * @returns Promise that resolves to a Blob containing the CSV data
 */
export async function exportToForm309CSV(
  receipts: Receipt[],
  submitter: Form309Submitter,
  taxYear: string
): Promise<Blob> {
  // Aggregate receipts by recipient
  const paymentRecords = aggregatePaymentRecords(receipts);

  // Calculate totals
  const totalPayments = paymentRecords.reduce(
    (sum, r) => sum + r.paymentAmount,
    0
  );
  const totalWithholdingTax = paymentRecords.reduce(
    (sum, r) => sum + r.withholdingTax,
    0
  );

  // Create export data structure
  const exportData: Form309Export = {
    submitter: {
      ...submitter,
      taxYear,
    },
    paymentRecords,
    totalPayments,
    totalWithholdingTax,
    metadata: {
      exportDate: new Date(),
      recordCount: paymentRecords.length,
      taxYear,
    },
  };

  // Validate export data
  const validation = validateForm309Export(exportData);
  if (!validation.isValid) {
    throw new Error(
      `Form 309 validation failed: ${validation.errors.join(', ')}`
    );
  }

  // Generate CSV content
  const csvContent = generateForm309CSV(exportData);

  // Encode to SHIFT-JIS for e-Tax compatibility
  const shiftJISBuffer = encode(csvContent, 'Shift_JIS');

  // Create blob from buffer - convert to Uint8Array for compatibility
  const blob = new Blob([new Uint8Array(shiftJISBuffer)], {
    type: 'text/csv;charset=Shift_JIS',
  });

  return blob;
}

/**
 * Download Form 309 CSV export to user's computer
 *
 * @param receipts Array of receipts to export
 * @param submitter Form 309 submitter information
 * @param taxYear Tax year (e.g., "06" for Reiwa 6/2024)
 */
export async function downloadForm309CSV(
  receipts: Receipt[],
  submitter: Form309Submitter,
  taxYear: string
): Promise<void> {
  const blob = await exportToForm309CSV(receipts, submitter, taxYear);

  // Generate filename with date
  const today = new Date().toISOString().split('T')[0];
  const filename = `支払調書_309_${today}.csv`;

  // Trigger download
  saveAs(blob, filename);
}
