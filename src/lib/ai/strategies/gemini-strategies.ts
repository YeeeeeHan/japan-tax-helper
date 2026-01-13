// Gemini-based extraction strategies

import type { GeminiExtractionResponse } from '@/types/receipt';
import { RECEIPT_EXTRACTION_PROMPT } from '../prompts';

/**
 * Extract receipt data using Gemini 2.5 Flash (RECOMMENDED)
 * Cost: ~$0.0016 per image (84% cheaper than 2.0)
 * Quality: Excellent - Latest stable model
 * Model: gemini-2.5-flash (stable)
 */
export async function extractWithGemini25Flash(
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<GeminiExtractionResponse> {
  return extractWithGeminiModel(imageBase64, mimeType, apiKey, 'gemini-2.5-flash');
}

/**
 * Extract receipt data using Gemini 2.5 Flash Lite (BUDGET)
 * Cost: ~$0.0005 per image (95% cheaper than 2.0)
 * Quality: Good - Faster, cheaper, good for clear receipts
 * Model: gemini-2.5-flash-lite (stable)
 */
export async function extractWithGemini25FlashLite(
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<GeminiExtractionResponse> {
  return extractWithGeminiModel(imageBase64, mimeType, apiKey, 'gemini-2.5-flash-lite');
}

/**
 * Extract receipt data using Gemini 2.0 Flash (DEPRECATED)
 * @deprecated Will be retired March 3, 2026 - Use extractWithGemini25Flash() instead
 * Cost: ~$0.01 per image
 * Quality: High
 */
export async function extractWithGemini20Flash(
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<GeminiExtractionResponse> {
  console.warn('[DEPRECATION WARNING] gemini-2.0-flash-exp will be retired on March 3, 2026. Please migrate to gemini-2.5-flash.');
  return extractWithGeminiModel(imageBase64, mimeType, apiKey, 'gemini-2.0-flash-exp');
}

/**
 * Extract receipt data using Gemini 1.5 Flash (budget model)
 * Cost: ~$0.003 per image (70% cheaper)
 * Quality: Good, slightly lower than 2.0
 */
export async function extractWithGemini15Flash(
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<GeminiExtractionResponse> {
  return extractWithGeminiModel(imageBase64, mimeType, apiKey, 'gemini-1.5-flash');
}

/**
 * Core Gemini extraction function with smart token expansion
 * Starts with 2048 tokens, retries with more if JSON is truncated
 */
async function extractWithGeminiModel(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  modelName: string
): Promise<GeminiExtractionResponse> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);

  // Token limits to try (exponential expansion)
  const tokenLimits = [2048, 4096, 8192];
  let lastError: any;

  for (let attempt = 0; attempt < tokenLimits.length; attempt++) {
    const maxTokens = tokenLimits[attempt];

    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: maxTokens,
          responseMimeType: 'application/json',
        },
      });

      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType,
        },
      };

      console.log(`[Gemini] Calling ${modelName} (attempt ${attempt + 1}/${tokenLimits.length}, maxTokens: ${maxTokens})...`);
      const result = await model.generateContent([RECEIPT_EXTRACTION_PROMPT, imagePart]);
      const responseText = result.response.text();
      console.log(`[Gemini] ${modelName} returned successfully (${responseText.length} chars)`);

      const parsed = parseGeminiResponse(responseText, modelName);

      // Success - tag with metadata
      parsed.rawText = `[Extracted by ${modelName} with ${maxTokens} tokens]\n${responseText}`;

      if (attempt > 0) {
        console.log(`[Gemini] Success after token expansion (${tokenLimits[0]} → ${maxTokens})`);
      }

      return parsed;
    } catch (error: any) {
      lastError = error;

      // Check if error is due to truncated JSON (incomplete output)
      const isTruncatedJson =
        error.message?.includes('Unexpected end of JSON input') ||
        error.message?.includes('Unterminated string') ||
        error.message?.includes('Invalid response format from AI');

      if (isTruncatedJson && attempt < tokenLimits.length - 1) {
        // Try again with more tokens
        console.warn(`[Gemini] JSON truncated with ${maxTokens} tokens. Retrying with ${tokenLimits[attempt + 1]} tokens...`);
        continue;
      }

      // Not a truncation error or out of retries - throw
      console.error(`Gemini API error (${modelName}, ${maxTokens} tokens):`, error);
      throw new Error(`Failed to extract receipt data with ${modelName}`);
    }
  }

  // All token limits exhausted
  throw lastError;
}

/**
 * Attempt to salvage incomplete JSON by fixing common truncation issues
 */
function attemptFallbackParse(jsonText: string): any {
  console.log('[Gemini Fallback] Attempting to fix incomplete JSON...');

  let fixed = jsonText;

  // Strategy 1: Try to close incomplete strings
  // Count quotes to see if we have an unclosed string
  const quoteCount = (fixed.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    fixed += '"';
    console.log('[Gemini Fallback] Added closing quote');
  }

  // Strategy 2: Close any unclosed objects/arrays by counting braces
  const openBraces = (fixed.match(/{/g) || []).length;
  const closeBraces = (fixed.match(/}/g) || []).length;
  const openBrackets = (fixed.match(/\[/g) || []).length;
  const closeBrackets = (fixed.match(/]/g) || []).length;

  // Add missing closing braces
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    fixed += ']';
    console.log('[Gemini Fallback] Added closing bracket');
  }
  for (let i = 0; i < openBraces - closeBraces; i++) {
    fixed += '}';
    console.log('[Gemini Fallback] Added closing brace');
  }

  // Strategy 3: Remove trailing comma if present (invalid JSON)
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

  // Try parsing the fixed JSON
  try {
    const result = JSON.parse(fixed);
    console.log('[Gemini Fallback] Successfully salvaged incomplete JSON!');
    return result;
  } catch (error) {
    console.error('[Gemini Fallback] Could not salvage JSON even after fixes');
    throw new Error('Invalid response format from AI');
  }
}

/**
 * Parse and validate Gemini API response with fallback for truncated JSON
 */
function parseGeminiResponse(responseText: string, modelName: string = 'gemini'): GeminiExtractionResponse {
  let parsed: any;

  try {
    let jsonText = responseText.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    // Log first/last 100 chars for debugging truncation issues
    console.log(`[Gemini Parse] First 100 chars: ${jsonText.substring(0, 100)}`);
    console.log(`[Gemini Parse] Last 100 chars: ${jsonText.substring(Math.max(0, jsonText.length - 100))}`);

    // Try standard JSON parse first
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError: any) {
      // Attempt fallback parsing for incomplete JSON
      console.warn(`[Gemini Parse] Standard parse failed, attempting fallback...`);
      parsed = attemptFallbackParse(jsonText);
    }

    const requiredFields = [
      'issuerName',
      'transactionDate',
      'description',
      'subtotalExcludingTax',
      'taxBreakdown',
      'totalAmount',
      'suggestedCategory',
      'confidence',
    ];

    for (const field of requiredFields) {
      if (!(field in parsed)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const extractedData = {
      ...parsed,
      transactionDate: new Date(parsed.transactionDate),
    };

    const overallConfidence = calculateOverallConfidence(parsed.confidence);

    const warnings: string[] = [];

    if (parsed.confidence?.tNumber !== undefined && parsed.confidence.tNumber < 0.8) {
      warnings.push('T-Number has low confidence');
    }
    if (parsed.confidence?.totalAmount !== undefined && parsed.confidence.totalAmount < 0.8) {
      warnings.push('Total amount has low confidence');
    }
    if (!parsed.tNumber) {
      warnings.push('T-Number not found on receipt');
    }

    return {
      extractedData,
      confidence: {
        overall: overallConfidence,
        fields: parsed.confidence || {},
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    console.error(`[Gemini Parse Error] Model: ${modelName}`, error);
    console.error(`[Gemini Parse Error] Response text (full):`, responseText);
    console.error(`[Gemini Parse Error] Response length:`, responseText.length);
    throw new Error('Invalid response format from AI');
  }
}

function calculateOverallConfidence(fieldConfidences: any): number {
  const weights = {
    issuerName: 1.0,
    tNumber: 2.0,
    transactionDate: 1.5,
    totalAmount: 2.0,
    taxBreakdown: 1.5,
    category: 0.5,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [field, weight] of Object.entries(weights)) {
    if (field in fieldConfidences) {
      weightedSum += fieldConfidences[field] * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}
