// Confidence-based Routing Strategy
//
// This is the most cost-effective engineering approach:
// 1. First pass: PaddleOCR (free)
// 2. Check confidence and required fields
// 3. If low quality, route to expensive model (Gemini)
//
// Expected result: 80-90% of receipts handled by free OCR

import type { GeminiExtractionResponse } from '@/types/receipt';
import { extractWithPaddleOCR, isPaddleOCRResultAcceptable } from './paddle-strategy';
import { extractWithGemini15Flash } from './gemini-strategies';

// Confidence thresholds for routing
const CONFIDENCE_THRESHOLD = 0.85; // Below this, use expensive model
const REQUIRED_FIELD_PATTERNS = {
  date: /\d{4}[年\/\-]\d{1,2}[月\/\-]\d{1,2}/,
  total: /合計|小計|TOTAL/i,
  tNumber: /T[\s-]?\d/,
};

export interface ConfidenceRoutingResult {
  result: GeminiExtractionResponse;
  estimatedCost: number;
  routingDecision: 'paddle' | 'gemini';
  routingReason?: string;
}

/**
 * Extract using confidence-based routing
 *
 * Flow:
 * 1. Try PaddleOCR first (free)
 * 2. Check if result is acceptable
 * 3. If not, fallback to Gemini (paid)
 */
export async function extractWithConfidenceRouting(
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<ConfidenceRoutingResult> {
  // Check if PaddleOCR is available
  const paddleAvailable = !!process.env.PADDLE_OCR_ENDPOINT;

  if (!paddleAvailable) {
    // PaddleOCR not configured, use Gemini directly
    console.log('[ConfidenceRouting] PaddleOCR not available, using Gemini directly');
    const result = await extractWithGemini15Flash(imageBase64, mimeType, apiKey);
    return {
      result,
      estimatedCost: 0.003,
      routingDecision: 'gemini',
      routingReason: 'PaddleOCR server not configured',
    };
  }

  try {
    // Step 1: Try PaddleOCR
    console.log('[ConfidenceRouting] Step 1: Trying PaddleOCR...');
    const paddleResult = await extractWithPaddleOCR(imageBase64, mimeType);

    // Step 2: Evaluate quality
    const qualityCheck = evaluateExtractionQuality(paddleResult);

    if (qualityCheck.isAcceptable) {
      // PaddleOCR result is good enough
      console.log('[ConfidenceRouting] PaddleOCR result accepted');
      return {
        result: paddleResult,
        estimatedCost: 0,
        routingDecision: 'paddle',
        routingReason: 'PaddleOCR confidence above threshold',
      };
    }

    // Step 3: Fallback to Gemini
    console.log(`[ConfidenceRouting] Routing to Gemini: ${qualityCheck.reason}`);
    const geminiResult = await extractWithGemini15Flash(imageBase64, mimeType, apiKey);

    return {
      result: geminiResult,
      estimatedCost: 0.003,
      routingDecision: 'gemini',
      routingReason: qualityCheck.reason,
    };
  } catch (paddleError) {
    // PaddleOCR failed, fallback to Gemini
    console.error('[ConfidenceRouting] PaddleOCR failed:', paddleError);
    const geminiResult = await extractWithGemini15Flash(imageBase64, mimeType, apiKey);

    return {
      result: geminiResult,
      estimatedCost: 0.003,
      routingDecision: 'gemini',
      routingReason: 'PaddleOCR extraction failed',
    };
  }
}

interface QualityCheckResult {
  isAcceptable: boolean;
  reason: string;
  confidenceScore: number;
  missingFields: string[];
}

/**
 * Evaluate extraction quality to decide if we need expensive model
 */
function evaluateExtractionQuality(result: GeminiExtractionResponse): QualityCheckResult {
  const missingFields: string[] = [];
  let reason = '';

  // Check confidence threshold
  if (result.confidence.overall < CONFIDENCE_THRESHOLD) {
    reason = `Low confidence: ${(result.confidence.overall * 100).toFixed(1)}%`;
    return {
      isAcceptable: false,
      reason,
      confidenceScore: result.confidence.overall,
      missingFields,
    };
  }

  // Check required fields
  const { extractedData } = result;

  // Must have date
  if (!extractedData.transactionDate || isNaN(extractedData.transactionDate.getTime())) {
    missingFields.push('transactionDate');
  }

  // Must have total amount > 0
  if (!extractedData.totalAmount || extractedData.totalAmount <= 0) {
    missingFields.push('totalAmount');
  }

  // Must have issuer name
  if (!extractedData.issuerName || extractedData.issuerName.trim().length === 0) {
    missingFields.push('issuerName');
  }

  // Check for garbled text (common OCR issue)
  if (hasGarbledText(extractedData.issuerName)) {
    missingFields.push('issuerName (garbled)');
  }

  if (missingFields.length > 0) {
    reason = `Missing or invalid fields: ${missingFields.join(', ')}`;
    return {
      isAcceptable: false,
      reason,
      confidenceScore: result.confidence.overall,
      missingFields,
    };
  }

  // All checks passed
  return {
    isAcceptable: true,
    reason: 'All quality checks passed',
    confidenceScore: result.confidence.overall,
    missingFields: [],
  };
}

/**
 * Check if text contains garbled characters (common OCR failure mode)
 * Japanese receipts often have mixed half-width/full-width characters
 */
function hasGarbledText(text: string): boolean {
  if (!text) return false;

  // Check for unusual character sequences
  // Pattern: too many consecutive numbers/symbols without meaning
  const garbledPatterns = [
    /[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u0020-\u007Ea-zA-Z0-9ー\-・。、()（）「」\s]{3,}/,
    // Too many consecutive numbers where text expected
    /^[\d\s]{10,}$/,
    // Only special characters
    /^[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/,
  ];

  return garbledPatterns.some(pattern => pattern.test(text));
}

/**
 * Simulate confidence routing for testing
 * When PaddleOCR is not available, this simulates the routing decision
 */
export async function simulateConfidenceRouting(
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<ConfidenceRoutingResult> {
  // Always use Gemini but simulate what the cost would be
  const geminiResult = await extractWithGemini15Flash(imageBase64, mimeType, apiKey);

  // Simulate: if confidence is high, we would have used PaddleOCR
  const wouldUsePaddle = geminiResult.confidence.overall >= CONFIDENCE_THRESHOLD;

  return {
    result: geminiResult,
    // Estimated cost: 80% free (paddle), 20% paid (gemini)
    estimatedCost: wouldUsePaddle ? 0 : 0.003,
    routingDecision: wouldUsePaddle ? 'paddle' : 'gemini',
    routingReason: wouldUsePaddle
      ? 'High confidence - would use PaddleOCR in production'
      : 'Low confidence - would route to Gemini in production',
  };
}
