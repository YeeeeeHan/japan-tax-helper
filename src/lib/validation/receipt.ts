import type { ExtractedData } from '@/types/receipt';

/**
 * Validate T-Number format (T + 13 digits)
 */
export function validateTNumber(tNumber: string | null): boolean {
  if (!tNumber) return false;
  return /^T\d{13}$/.test(tNumber);
}

/**
 * Validate tax calculation
 * Sum of all tax amounts should equal total - subtotal (with 1 yen tolerance)
 */
export function validateTaxCalculation(data: ExtractedData): {
  isValid: boolean;
  error?: string;
} {
  const calculatedTax = data.taxBreakdown.reduce((sum, tb) => sum + tb.taxAmount, 0);

  const expectedTax = data.totalAmount - data.subtotalExcludingTax;

  // Allow 1 yen rounding error
  const difference = Math.abs(calculatedTax - expectedTax);

  if (difference > 1) {
    return {
      isValid: false,
      error: `Tax calculation mismatch: expected ${expectedTax}円, got ${calculatedTax}円`,
    };
  }

  return { isValid: true };
}

/**
 * Validate tax breakdown totals
 * Sum of all tax breakdown totals should equal total amount
 */
export function validateTaxBreakdownTotals(data: ExtractedData): {
  isValid: boolean;
  error?: string;
} {
  const calculatedTotal = data.taxBreakdown.reduce((sum, tb) => sum + tb.total, 0);

  // Allow 1 yen rounding error
  const difference = Math.abs(calculatedTotal - data.totalAmount);

  if (difference > 1) {
    return {
      isValid: false,
      error: `Total amount mismatch: expected ${data.totalAmount}円, got ${calculatedTotal}円`,
    };
  }

  return { isValid: true };
}

/**
 * Validate that tax rates are valid (8% or 10%)
 */
export function validateTaxRates(data: ExtractedData): {
  isValid: boolean;
  error?: string;
} {
  const validRates = [8, 10];

  for (const tb of data.taxBreakdown) {
    if (!validRates.includes(tb.taxRate)) {
      return {
        isValid: false,
        error: `Invalid tax rate: ${tb.taxRate}%. Must be 8% or 10%`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Comprehensive validation of extracted receipt data
 */
export function validateReceiptData(data: ExtractedData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields check
  if (!data.issuerName) {
    errors.push('Issuer name is required');
  }

  if (!data.transactionDate) {
    errors.push('Transaction date is required');
  }

  if (!data.totalAmount || data.totalAmount <= 0) {
    errors.push('Total amount must be greater than 0');
  }

  // T-Number validation
  if (data.tNumber) {
    if (!validateTNumber(data.tNumber)) {
      errors.push('Invalid T-Number format. Must be T followed by 13 digits');
    }
  } else {
    warnings.push('T-Number is missing. This receipt may not be compliant with 適格請求書 requirements');
  }

  // Tax calculation validation
  const taxCalcResult = validateTaxCalculation(data);
  if (!taxCalcResult.isValid && taxCalcResult.error) {
    warnings.push(taxCalcResult.error);
  }

  // Tax breakdown totals validation
  const taxTotalsResult = validateTaxBreakdownTotals(data);
  if (!taxTotalsResult.isValid && taxTotalsResult.error) {
    warnings.push(taxTotalsResult.error);
  }

  // Tax rates validation
  const taxRatesResult = validateTaxRates(data);
  if (!taxRatesResult.isValid && taxRatesResult.error) {
    errors.push(taxRatesResult.error);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Determine if receipt needs review based on confidence and validation
 */
export function needsReview(
  confidence: { overall: number; fields?: Record<string, number> },
  validationResult: ReturnType<typeof validateReceiptData>
): boolean {
  // Flag for review if:
  // 1. Overall confidence is low (< 0.75)
  // 2. Critical field confidence is low (< 0.8)
  // 3. Validation has errors or warnings
  // 4. T-number is missing or invalid

  if (!confidence || confidence.overall < 0.75) return true;

  const fields = confidence.fields;
  if (fields) {
    if (fields.tNumber !== undefined && fields.tNumber < 0.8) return true;
    if (fields.totalAmount !== undefined && fields.totalAmount < 0.8) return true;
  }

  if (validationResult.errors.length > 0) return true;
  if (validationResult.warnings.length > 0) return true;

  return false;
}
