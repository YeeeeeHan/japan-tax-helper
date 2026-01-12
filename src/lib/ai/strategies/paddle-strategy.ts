// PaddleOCR Strategy (Placeholder)
//
// PaddleOCR is an open-source OCR system by Baidu with excellent CJK support.
// This is a placeholder implementation - actual implementation requires:
// 1. PaddleOCR server running (Python with paddleocr package)
// 2. API endpoint to call the server
// 3. Post-processing to structure raw OCR text into fields

import type { GeminiExtractionResponse, ExtractedData, TaxBreakdown } from '@/types/receipt';

// PaddleOCR server endpoint (configure this when implementing)
const PADDLE_OCR_ENDPOINT = process.env.PADDLE_OCR_ENDPOINT || 'http://localhost:8866/predict/ocr_system';

export interface PaddleOCRResult {
  text: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
}

/**
 * Extract receipt data using PaddleOCR
 * Cost: $0 (self-hosted)
 * Quality: Good for Japanese text
 *
 * NOTE: This is a placeholder. Actual implementation requires:
 * 1. Running PaddleOCR server: paddleocr --use_gpu False --det_model_dir=... --rec_model_dir=...
 * 2. Using the Japanese model: --rec_char_dict_path=japan_dict.txt
 */
export async function extractWithPaddleOCR(
  imageBase64: string,
  mimeType: string
): Promise<GeminiExtractionResponse> {
  // Check if PaddleOCR server is configured
  if (!process.env.PADDLE_OCR_ENDPOINT) {
    throw new Error(
      'PaddleOCR not configured. Set PADDLE_OCR_ENDPOINT environment variable.\n' +
      'To set up PaddleOCR server:\n' +
      '1. pip install paddleocr\n' +
      '2. paddlehub serving start --modules paddleocr_server\n' +
      '3. Set PADDLE_OCR_ENDPOINT=http://localhost:8866/predict/ocr_system'
    );
  }

  try {
    // Call PaddleOCR server
    const response = await fetch(PADDLE_OCR_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: [imageBase64],
        // Use Japanese language model
        lang: 'japan',
      }),
    });

    if (!response.ok) {
      throw new Error(`PaddleOCR server error: ${response.status}`);
    }

    const result = await response.json();

    // Parse PaddleOCR result and structure into fields
    return parsePaddleOCRResult(result);
  } catch (error: any) {
    console.error('PaddleOCR error:', error);
    throw new Error(`PaddleOCR extraction failed: ${error.message}`);
  }
}

/**
 * Parse PaddleOCR raw output and structure into receipt fields
 * This uses heuristics and regex patterns to identify fields
 */
function parsePaddleOCRResult(paddleResult: any): GeminiExtractionResponse {
  // Extract text lines with confidence scores
  const lines: PaddleOCRResult[] = paddleResult.results?.[0] || [];

  // Combine all text for pattern matching
  const fullText = lines.map(l => l.text).join('\n');

  // Initialize extracted data with defaults
  const extractedData: ExtractedData = {
    issuerName: '',
    tNumber: null,
    transactionDate: new Date(),
    description: '',
    subtotalExcludingTax: 0,
    taxBreakdown: [],
    totalAmount: 0,
    suggestedCategory: '未分類',
    categoryConfidence: 0,
  };

  const confidence = {
    issuerName: 0,
    tNumber: 0,
    transactionDate: 0,
    totalAmount: 0,
    taxBreakdown: 0,
    category: 0,
  };

  // --- Pattern matching for Japanese receipts ---

  // 1. T-Number: T followed by 13 digits
  const tNumberMatch = fullText.match(/T[\s-]?(\d[\s-]?){13}/);
  if (tNumberMatch) {
    extractedData.tNumber = tNumberMatch[0].replace(/[\s-]/g, '');
    confidence.tNumber = getLineConfidence(lines, tNumberMatch[0]);
  }

  // 2. Date patterns: yyyy年mm月dd日, yyyy/mm/dd, yyyy-mm-dd
  const datePatterns = [
    /(\d{4})年(\d{1,2})月(\d{1,2})日/,
    /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
  ];
  for (const pattern of datePatterns) {
    const dateMatch = fullText.match(pattern);
    if (dateMatch) {
      const year = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1;
      const day = parseInt(dateMatch[3]);
      extractedData.transactionDate = new Date(year, month, day);
      confidence.transactionDate = getLineConfidence(lines, dateMatch[0]);
      break;
    }
  }

  // 3. Total amount: 合計, 小計, TOTAL followed by number
  const totalPatterns = [
    /合計[\s:：]*[¥￥]?[\s]*([\d,]+)/,
    /小計[\s:：]*[¥￥]?[\s]*([\d,]+)/,
    /TOTAL[\s:：]*[¥￥]?[\s]*([\d,]+)/i,
    /税込[\s:：]*[¥￥]?[\s]*([\d,]+)/,
  ];
  for (const pattern of totalPatterns) {
    const totalMatch = fullText.match(pattern);
    if (totalMatch) {
      extractedData.totalAmount = parseInt(totalMatch[1].replace(/,/g, ''));
      confidence.totalAmount = getLineConfidence(lines, totalMatch[0]);
      break;
    }
  }

  // 4. Tax breakdown: 10% and 8% tax amounts
  const tax10Match = fullText.match(/10%[\s]*[対消税]*[\s:：]*[¥￥]?[\s]*([\d,]+)/);
  const tax8Match = fullText.match(/8%[\s]*[対消税]*[\s:：]*[¥￥]?[\s]*([\d,]+)/);

  const taxBreakdown: TaxBreakdown[] = [];
  if (tax10Match) {
    taxBreakdown.push({
      taxRate: 10,
      subtotal: 0, // Would need more parsing
      taxAmount: parseInt(tax10Match[1].replace(/,/g, '')),
      total: 0,
    });
  }
  if (tax8Match) {
    taxBreakdown.push({
      taxRate: 8,
      subtotal: 0,
      taxAmount: parseInt(tax8Match[1].replace(/,/g, '')),
      total: 0,
    });
  }
  extractedData.taxBreakdown = taxBreakdown;
  confidence.taxBreakdown = taxBreakdown.length > 0 ? 0.7 : 0;

  // 5. Issuer name: Usually first line or line before address
  if (lines.length > 0) {
    // First line with high confidence is likely store name
    const firstHighConfLine = lines.find(l => l.confidence > 0.8);
    if (firstHighConfLine) {
      extractedData.issuerName = firstHighConfLine.text;
      confidence.issuerName = firstHighConfLine.confidence;
    }
  }

  // 6. Description: Combine item lines
  extractedData.description = 'PaddleOCR extraction (needs review)';

  // Calculate subtotal from total and tax
  const totalTax = taxBreakdown.reduce((sum, tb) => sum + tb.taxAmount, 0);
  extractedData.subtotalExcludingTax = extractedData.totalAmount - totalTax;

  // Calculate overall confidence
  const avgConfidence = lines.length > 0
    ? lines.reduce((sum, l) => sum + l.confidence, 0) / lines.length
    : 0;

  const overallConfidence = (
    confidence.issuerName * 1.0 +
    confidence.tNumber * 2.0 +
    confidence.transactionDate * 1.5 +
    confidence.totalAmount * 2.0 +
    confidence.taxBreakdown * 1.5 +
    confidence.category * 0.5
  ) / 8.5;

  return {
    extractedData,
    confidence: {
      overall: Math.min(overallConfidence, avgConfidence),
      fields: confidence,
    },
    rawText: fullText,
    warnings: [
      'Extracted with PaddleOCR - manual review recommended',
      ...(confidence.tNumber === 0 ? ['T-Number not found'] : []),
      ...(confidence.totalAmount === 0 ? ['Total amount not found'] : []),
    ],
  };
}

/**
 * Get confidence score for a specific text match
 */
function getLineConfidence(lines: PaddleOCRResult[], text: string): number {
  const matchingLine = lines.find(l => l.text.includes(text));
  return matchingLine?.confidence || 0.5;
}

/**
 * Check if PaddleOCR extraction quality is good enough
 * Returns true if we should use this result, false if we should fallback
 */
export function isPaddleOCRResultAcceptable(result: GeminiExtractionResponse): boolean {
  const { confidence, extractedData } = result;

  // Must have found key fields
  const hasTotal = extractedData.totalAmount > 0;
  const hasDate = extractedData.transactionDate instanceof Date;
  const hasIssuer = extractedData.issuerName.length > 0;

  // Must have reasonable confidence
  const avgConfidence = confidence.overall;

  // Threshold: 85% average confidence AND all key fields present
  return avgConfidence >= 0.85 && hasTotal && hasDate && hasIssuer;
}
