import type { ExtractedData } from '@/types/receipt';
import { EQUIPMENT_THRESHOLD, DEPRECIATION_THRESHOLDS } from '@/lib/utils/constants';

/**
 * Structured validation warning for translation support
 */
export type ValidationWarning = {
  type: 'tnumber_missing' | 'tax_calculation_mismatch' | 'total_amount_mismatch' | 'depreciation_required';
  params?: Record<string, string | number>;
};

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
  warnings: ValidationWarning[];
} {
  const errors: string[] = [];
  const warnings: ValidationWarning[] = [];

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
    warnings.push({ type: 'tnumber_missing' });
  }

  // Tax calculation validation
  const taxCalcResult = validateTaxCalculation(data);
  if (!taxCalcResult.isValid && taxCalcResult.error) {
    const calculatedTax = data.taxBreakdown.reduce((sum, tb) => sum + tb.taxAmount, 0);
    const expectedTax = data.totalAmount - data.subtotalExcludingTax;
    warnings.push({
      type: 'tax_calculation_mismatch',
      params: { expected: expectedTax, actual: calculatedTax },
    });
  }

  // Tax breakdown totals validation
  const taxTotalsResult = validateTaxBreakdownTotals(data);
  if (!taxTotalsResult.isValid && taxTotalsResult.error) {
    const calculatedTotal = data.taxBreakdown.reduce((sum, tb) => sum + tb.total, 0);
    warnings.push({
      type: 'total_amount_mismatch',
      params: { expected: data.totalAmount, actual: calculatedTotal },
    });
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

/**
 * Check if receipt requires depreciation consideration based on amount threshold
 * Returns true if amount >= ¥100,000 and category is 消耗品費 (or related)
 *
 * Per Japanese tax law:
 * - Items < ¥100,000: Can be expensed immediately as 消耗品費
 * - Items >= ¥100,000: May require depreciation treatment (固定資産)
 *
 * Note: The category remains 消耗品費 per NTA official categories,
 * but a depreciation warning is shown to the user.
 */
export function requiresDepreciationConsideration(data: ExtractedData): boolean {
  // Only flag if amount is >= ¥100,000
  if (data.totalAmount < EQUIPMENT_THRESHOLD) {
    return false;
  }

  // Flag if current category is 消耗品費 (consumables)
  if (data.suggestedCategory === '消耗品費') {
    return true;
  }

  // Also flag for uncategorized items with high-value equipment indicators
  if (data.suggestedCategory === '未分類') {
    const equipmentKeywords = ['PC', 'パソコン', 'タブレット', 'iPad', 'MacBook', 'モニター', 'プリンター', 'デスク', '椅子'];
    const description = (data.description || '').toLowerCase();
    return equipmentKeywords.some(kw => description.toLowerCase().includes(kw.toLowerCase()));
  }

  return false;
}

/**
 * Get the depreciation method note based on amount and current date
 * Returns appropriate depreciation guidance based on 少額減価償却資産の特例 thresholds
 */
export function getDepreciationNote(amount: number): {
  method: 'immediate' | 'lumpsum' | 'standard';
  note: string;
  requiresRegistration: boolean;
} | null {
  if (amount < EQUIPMENT_THRESHOLD) {
    return null; // No depreciation needed
  }

  const now = new Date();
  const thresholdChangeDate = new Date(DEPRECIATION_THRESHOLDS.THRESHOLD_CHANGE_DATE);

  // Determine current special rule limit
  const currentLimit = now < thresholdChangeDate
    ? DEPRECIATION_THRESHOLDS.IMMEDIATE_EXPENSE_LIMIT_CURRENT
    : DEPRECIATION_THRESHOLDS.IMMEDIATE_EXPENSE_LIMIT_FUTURE;

  if (amount <= currentLimit) {
    // Can use 少額減価償却資産の特例 (immediate expensing for blue form filers)
    const limitText = now < thresholdChangeDate ? '30万円以下・2026年3月まで' : '40万円以下';
    return {
      method: 'immediate',
      note: `少額減価償却資産の特例対象（${limitText}）`,
      requiresRegistration: false,
    };
  }

  if (amount <= 200000) {
    // Can use 一括償却資産 (3-year lump-sum depreciation)
    return {
      method: 'lumpsum',
      note: '一括償却資産（3年均等償却）',
      requiresRegistration: false,
    };
  }

  // Standard depreciation required
  return {
    method: 'standard',
    note: '通常減価償却（耐用年数による）',
    requiresRegistration: true,
  };
}

/**
 * Check if a receipt is a high-value asset requiring depreciation treatment
 */
export function isDepreciationEligible(data: ExtractedData): boolean {
  return data.totalAmount >= EQUIPMENT_THRESHOLD;
}
