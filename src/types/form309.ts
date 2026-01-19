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
