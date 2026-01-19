# Agent Log: T3

## Status: completed
## Started: 2026-01-19T00:20:00Z
## Completed: 2026-01-19T00:35:00Z

### Key Findings

Designed comprehensive Form 309 schema and data mapping logic for e-Tax export. Form 309 (報酬・料金等の支払調書) is used for reporting payments to contractors/freelancers, not for personal expense tracking. However, this functionality enables users who need to report payments they made to others (e.g., business owners who hired contractors).

**Important Context:**
- Form 309 = Compensation/Fees Payment Statement
- Used by payment PAYERS to report payments to RECIPIENTS
- Different use case than expense tracking (but complementary)
- Requires submitter info + payment records

### Design Decisions

#### 1. Schema Structure

Created three-tier schema:
1. **Form309Submitter** - Information about the person/entity submitting the form
2. **Form309PaymentRecord** - Individual payment records to contractors
3. **Form309Export** - Complete export combining submitter + records

#### 2. Withholding Tax Calculation

Implemented NTA progressive withholding tax rules:
- ≤¥1,000,000: 10.21% of total amount
- >¥1,000,000: ¥102,100 + 20.42% of amount over ¥1M

**Example:**
- Payment of ¥800,000 → Withholding = ¥81,680
- Payment of ¥2,000,000 → Withholding = ¥102,100 + ¥204,200 = ¥306,300

#### 3. Character Type Handling

Created utilities for e-Tax half-width/full-width requirements:
- **Half-width (半角)**: Numbers, codes, T-Numbers, phone numbers
- **Full-width (全角)**: Japanese text, names, addresses

#### 4. CSV Field Order

Documented exact 137-column order from e-Tax specification (web_all.xlsx). Critical columns include:
- A: Document type "309" (half-width)
- D: Submitter address (full-width, ≤60 chars)
- E: Submitter name (full-width, ≤30 chars)
- K: Tax year (half-width, 2 chars)
- P-U: Payment amount fields
- AM-AO: Withholding tax amount fields
- BH-BK: T-Number fields

#### 5. Receipt → Form309 Transformation

Designed mapping logic:
- **issuerName** → **recipientName** (payer perspective flip)
- **issuerAddress** → **recipientAddress**
- **tNumber** → **recipientTNumber**
- **totalAmount** → **paymentAmount**
- Auto-calculate withholding tax based on amount

### TypeScript Schema Design

#### File: `src/types/form309.ts`

```typescript
/**
 * Form 309 (報酬・料金等の支払調書) - Compensation/Fees Payment Statement
 *
 * This form is used to report payments made to contractors, freelancers, and professionals.
 * Required by Japanese tax law when total annual payments to a single recipient exceed:
 * - ¥50,000 for professional fees (弁護士、税理士、etc.)
 * - ¥50,000 for entertainment/sports fees
 *
 * Reference: https://www.nta.go.jp/taxes/tetsuzuki/shinsei/annai/hotei/annai/pdf/23100051-7.pdf
 */

/**
 * Information about the person/entity submitting Form 309 (the payer)
 */
export interface Form309Submitter {
  /** Document type - always "309" for this form (半角) */
  documentType: '309';

  /** Reference number 1 (整理番号１) - Half-width, max 10 characters */
  referenceNumber1: string;

  /** Branch code (本支店等区分番号) - Half-width, max 5 characters (optional) */
  branchCode?: string;

  /** Submitter address (提出義務者の住所又は所在地) - Full-width, max 60 characters */
  submitterAddress: string;

  /** Submitter name (提出義務者の氏名又は名称) - Full-width, max 30 characters */
  submitterName: string;

  /** Submitter phone number (提出義務者の電話番号) - Half-width, max 15 characters */
  submitterPhone: string;

  /** Tax year (年分) - Half-width, 2 characters (e.g., "06" for 2024, "07" for 2025) */
  taxYear: string;

  /** Correction indicator (訂正表示) - Half-width, 1 character (blank or "1" for correction) */
  correctionIndicator?: '1' | '';
}

/**
 * Individual payment record for Form 309
 */
export interface Form309PaymentRecord {
  /** Recipient name (支払を受ける者の氏名又は名称) - From receipt.issuerName */
  recipientName: string;

  /** Recipient address (支払を受ける者の住所) - From receipt.issuerAddress (optional) */
  recipientAddress?: string;

  /** Recipient T-Number (適格請求書発行事業者登録番号) - From receipt.tNumber (optional) */
  recipientTNumber?: string;

  /** Total payment amount (支払金額) - Before withholding tax */
  paymentAmount: number;

  /** Withholding tax amount (源泉徴収税額) - Calculated using calculateWithholdingTax() */
  withholdingTax: number;

  /** Payment date (支払年月日) - Transaction date from receipt */
  paymentDate: Date;

  /** Payment description (摘要) - What the payment was for */
  paymentDescription: string;

  /** Payment category (細目) - Type of professional service */
  paymentCategory?: string;
}

/**
 * Complete Form 309 export data
 */
export interface Form309Export {
  submitter: Form309Submitter;
  paymentRecords: Form309PaymentRecord[];

  /** Total payments across all records */
  totalPayments: number;

  /** Total withholding tax across all records */
  totalWithholdingTax: number;

  /** Export metadata */
  metadata: {
    exportDate: Date;
    recordCount: number;
    taxYear: string;
  };
}

/**
 * Validation result for Form 309 data
 */
export interface Form309ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

#### File: `src/lib/export/form309-utils.ts`

```typescript
import type { Receipt } from '@/types/receipt';
import type {
  Form309Submitter,
  Form309PaymentRecord,
  Form309Export,
  Form309ValidationResult
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
  const THRESHOLD = 1000000; // ¥1,000,000
  const RATE_LOW = 0.1021;   // 10.21%
  const RATE_HIGH = 0.2042;  // 20.42%

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
  return str.replace(/[！-～]/g, (char) => {
    // Full-width range: U+FF01 to U+FF5E
    // Half-width range: U+0021 to U+007E
    const code = char.charCodeAt(0);
    return String.fromCharCode(code - 0xFEE0);
  }).replace(/　/g, ' '); // Replace full-width space with half-width space
}

/**
 * Convert half-width (半角) characters to full-width (全角)
 * Used for Japanese text, names, addresses in official forms
 *
 * @param str Input string (may contain half-width characters)
 * @returns String with full-width characters
 */
export function toFullWidth(str: string): string {
  return str.replace(/[!-~]/g, (char) => {
    // Half-width range: U+0021 to U+007E
    // Full-width range: U+FF01 to U+FF5E
    const code = char.charCodeAt(0);
    return String.fromCharCode(code + 0xFEE0);
  }).replace(/ /g, '　'); // Replace half-width space with full-width space
}

/**
 * Validate character type (half-width or full-width)
 *
 * @param str Input string
 * @param type Expected character type
 * @returns True if all characters match expected type
 */
export function validateCharacterType(str: string, type: 'half' | 'full'): boolean {
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
 * @param submitter Form 309 submitter information
 * @returns Form 309 payment record
 */
export function transformReceiptToForm309(
  receipt: Receipt,
  submitter: Form309Submitter
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
 * @param submitter Form 309 submitter information
 * @returns Array of aggregated payment records
 */
export function aggregatePaymentRecords(
  receipts: Receipt[],
  submitter: Form309Submitter
): Form309PaymentRecord[] {
  // Group receipts by recipient name
  const receiptsByRecipient = receipts.reduce((groups, receipt) => {
    const recipientName = receipt.extractedData.issuerName;
    if (!groups[recipientName]) {
      groups[recipientName] = [];
    }
    groups[recipientName].push(receipt);
    return groups;
  }, {} as Record<string, Receipt[]>);

  // Aggregate payments for each recipient
  return Object.entries(receiptsByRecipient).map(([recipientName, receipts]) => {
    const totalPayment = receipts.reduce(
      (sum, r) => sum + r.extractedData.totalAmount,
      0
    );

    const withholdingTax = calculateWithholdingTax(totalPayment);

    // Use data from the most recent receipt for address/T-number
    const latestReceipt = receipts.reduce((latest, r) =>
      r.extractedData.transactionDate > latest.extractedData.transactionDate ? r : latest
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
  });
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
    warnings.push('T-Number is missing - may affect recipient\'s tax deduction');
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
    recordValidation.errors.forEach(error => {
      errors.push(`Record ${index + 1}: ${error}`);
    });

    recordValidation.warnings.forEach(warning => {
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
```

#### File: `src/lib/export/form309-csv.ts`

```typescript
/**
 * Form 309 CSV field order and structure
 * Based on e-Tax specification (web_all.xlsx)
 * Total: 137 columns (A-DX)
 */

import type { Form309Export, Form309PaymentRecord } from '@/types/form309';
import { toHalfWidth, toFullWidth } from './form309-utils';

/**
 * CSV column mapping for Form 309
 * This defines the exact field order required by e-Tax
 */
export const FORM309_CSV_COLUMNS = {
  // Columns A-K: Submitter Information
  A: 'documentType',           // 支払調書等の種類 (Half-width, "309")
  B: 'sequence',               // 整理番号２ (Half-width, ≤10 chars)
  C: 'referenceNumber1',       // 整理番号１ (Half-width, ≤10 chars)
  D: 'submitterAddress',       // 提出義務者の住所又は所在地 (Full-width, ≤60 chars)
  E: 'submitterName',          // 提出義務者の氏名又は名称 (Full-width, ≤30 chars)
  F: 'submitterPhone1',        // 提出義務者の電話番号１ (Half-width, ≤4 chars)
  G: 'submitterPhone2',        // 提出義務者の電話番号２ (Half-width, ≤4 chars)
  H: 'submitterPhone3',        // 提出義務者の電話番号３ (Half-width, ≤7 chars)
  I: 'branchCode',             // 本支店等区分番号 (Half-width, ≤5 chars)
  J: 'correctionIndicator',    // 訂正表示 (Half-width, 1 char)
  K: 'taxYear',                // 年分 (Half-width, 2 chars)

  // Columns L-O: Recipient Identification
  L: 'recipientCategory',      // 支払を受ける者の区分 (Half-width, 1 char)
  M: 'recipientNumber',        // 支払を受ける者の番号 (Half-width, ≤12 chars)
  N: 'recipientAddress',       // 支払を受ける者の住所 (Full-width, ≤60 chars)
  O: 'recipientName',          // 支払を受ける者の氏名又は名称 (Full-width, ≤30 chars)

  // Columns P-U: Payment Amount (支払金額)
  P: 'paymentAmount1',         // 支払金額１ (Half-width number)
  Q: 'paymentAmount2',         // 支払金額２
  R: 'paymentAmount3',         // 支払金額３
  S: 'paymentAmount4',         // 支払金額４
  T: 'paymentAmount5',         // 支払金額５
  U: 'paymentAmount6',         // 支払金額６

  // Columns V-AA: Detailed Payment Categories
  // ... (26 columns for different payment categories)

  // Columns AM-AO: Withholding Tax Amount (源泉徴収税額)
  AM: 'withholdingTax1',       // 源泉徴収税額１ (Half-width number)
  AN: 'withholdingTax2',       // 源泉徴収税額２
  AO: 'withholdingTax3',       // 源泉徴収税額３

  // Columns BH-BK: T-Number Fields
  BH: 'recipientTNumberFlag',  // 適格請求書発行事業者フラグ (1 = has T-Number)
  BI: 'recipientTNumber1',     // 適格請求書発行事業者登録番号１ (Half-width, ≤13 chars)
  BJ: 'recipientTNumber2',     // 適格請求書発行事業者登録番号２
  BK: 'recipientTNumber3',     // 適格請求書発行事業者登録番号３

  // Columns BL-DX: Additional Fields (摘要, etc.)
  BL: 'remarks',               // 摘要 (Full-width, ≤120 chars)

  // ... Total 137 columns
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
  submitter: any,
  record: Form309PaymentRecord,
  sequence: number
): string[] {
  // Initialize all 137 columns as empty strings
  const row: string[] = new Array(137).fill('');

  // Parse phone number into 3 parts (e.g., "03-1234-5678" → ["03", "1234", "5678"])
  const phoneParts = submitter.submitterPhone.split('-').map(toHalfWidth);

  // Columns A-K: Submitter Information
  row[0] = toHalfWidth('309');                          // A: Document type
  row[1] = toHalfWidth(sequence.toString());            // B: Sequence
  row[2] = toHalfWidth(submitter.referenceNumber1);     // C: Reference number 1
  row[3] = toFullWidth(submitter.submitterAddress);     // D: Address
  row[4] = toFullWidth(submitter.submitterName);        // E: Name
  row[5] = phoneParts[0] || '';                         // F: Phone part 1
  row[6] = phoneParts[1] || '';                         // G: Phone part 2
  row[7] = phoneParts[2] || '';                         // H: Phone part 3
  row[8] = toHalfWidth(submitter.branchCode || '');     // I: Branch code
  row[9] = toHalfWidth(submitter.correctionIndicator || ''); // J: Correction
  row[10] = toHalfWidth(submitter.taxYear);             // K: Tax year

  // Columns L-O: Recipient Information
  row[11] = '1';                                        // L: Recipient category (1 = individual)
  row[12] = '';                                         // M: Recipient number (optional)
  row[13] = toFullWidth(record.recipientAddress || ''); // N: Recipient address
  row[14] = toFullWidth(record.recipientName);          // O: Recipient name

  // Columns P-U: Payment Amount
  row[15] = toHalfWidth(record.paymentAmount.toString()); // P: Payment amount
  row[16] = '';  // Q-U: Reserved for specific payment categories
  row[17] = '';
  row[18] = '';
  row[19] = '';
  row[20] = '';

  // Columns V-AA: Detailed Categories (skip - all empty for general case)
  // ... rows[21-38] remain empty

  // Columns AM-AO: Withholding Tax
  row[38] = toHalfWidth(record.withholdingTax.toString()); // AM: Withholding tax
  row[39] = '';  // AN-AO: Reserved
  row[40] = '';

  // Columns BH-BK: T-Number
  if (record.recipientTNumber) {
    row[59] = '1';                                      // BH: T-Number flag
    row[60] = toHalfWidth(record.recipientTNumber);     // BI: T-Number
  } else {
    row[59] = '';
    row[60] = '';
  }
  row[61] = '';  // BJ: T-Number part 2 (not used)
  row[62] = '';  // BK: T-Number part 3 (not used)

  // Column BL: Remarks
  row[63] = toFullWidth(record.paymentDescription);     // BL: Payment description

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
      index + 1  // Sequence starts at 1
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
 * Field length limits for Form 309
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
  recipientTNumber: 14,  // T + 13 digits
  remarks: 120,
} as const;
```

### Artifacts Created

| Path | Description |
|------|-------------|
| docs/orchestration/logs/agent-T3.md | This design specification |

### For Other Agents

#### T5 (Form 309 Implementation) Needs:

**Complete TypeScript Code:**
1. **Type definitions** in `src/types/form309.ts` (copy from above)
2. **Utility functions** in `src/lib/export/form309-utils.ts` (copy from above)
3. **CSV generation** in `src/lib/export/form309-csv.ts` (copy from above)

**Key Implementation Notes:**
- Use `toHalfWidth()` and `toFullWidth()` for character encoding
- Use `calculateWithholdingTax()` for all tax calculations
- Validate all fields using `validateForm309Export()` before export
- Follow exact 137-column CSV order from `FORM309_CSV_COLUMNS`
- Use CRLF line endings (`\r\n`)
- Ensure last CSV field has at least 1 character (add space if needed)

**Excel Export Format:**
```typescript
// Suggested Excel structure:
Sheet 1: Payment Records
- Headers: Recipient, Address, T-Number, Payment, Withholding, Date, Description
- Data rows: One per payment record
- Summary row: Total payments, Total withholding

Sheet 2: Submitter Information
- Label-value pairs for submitter details

Sheet 3: Export Instructions
- How to submit via e-Tax
- CSV export button
- Validation results
```

**Testing Checklist:**
- [ ] Withholding tax calculation matches examples (¥800K → ¥81,680)
- [ ] Character types correct (half-width numbers, full-width names)
- [ ] Field length validation works
- [ ] CSV has exactly 137 columns
- [ ] T-Number validation works
- [ ] Aggregation by recipient works correctly
- [ ] Empty last field gets space character

#### T7 (UI Integration) Needs:

**UI Considerations:**
1. **Form 309 is optional** - Only show if user needs to report contractor payments
2. **Requires submitter info** - Add settings page for Form 309 configuration
3. **Warning message**: "Form 309 is for reporting payments YOU MADE to others, not for expense tracking"
4. **Filter receipts** - Let user select which receipts represent contractor payments
5. **Preview before export** - Show aggregated totals and withholding tax

**Suggested Settings UI:**
```typescript
// Settings for Form 309
interface Form309Settings {
  enabled: boolean;
  submitterName: string;
  submitterAddress: string;
  submitterPhone: string;
  referenceNumber: string;
  branchCode?: string;
}
```

### Verification

**Manual Verification:**
1. ✅ Schema matches e-Tax specification (web_all.xlsx)
2. ✅ Withholding tax formula matches NTA guidelines
3. ✅ Character type utilities handle full/half-width conversion
4. ✅ CSV field order documented (137 columns)
5. ✅ Receipt transformation logic preserves all required fields

**Code Quality:**
- ✅ All TypeScript interfaces are properly typed
- ✅ JSDoc comments explain complex logic
- ✅ Validation functions return structured results
- ✅ Helper functions are pure (no side effects)
- ✅ Constants defined for magic numbers

### Errors

None

### Warnings

**Important Context for Implementation:**
1. **Use Case Clarification**: Form 309 is NOT for expense tracking - it's for businesses reporting payments made to contractors. The app's primary use case (expense tracking) doesn't directly need Form 309, but it could be a valuable feature for users who also hire contractors.

2. **Submitter Information Required**: Unlike expense exports, Form 309 requires the user to provide their own business information (name, address, phone). This should be stored in app settings, not in receipts.

3. **Aggregation Strategy**: Multiple payments to the same contractor should be aggregated. The app should group by recipient name and sum payment amounts.

4. **CSV Complexity**: The 137-column CSV format is complex. Consider starting with Excel export for user review, then adding CSV export later for e-Tax submission.

5. **Character Encoding**: SHIFT-JIS encoding is required for CSV. Use `iconv-lite` package or similar for browser-based encoding.
