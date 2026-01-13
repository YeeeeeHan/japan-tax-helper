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
 * Core Gemini extraction function
 */
async function extractWithGeminiModel(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  modelName: string
): Promise<GeminiExtractionResponse> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  });

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType: mimeType,
    },
  };

  try {
    console.log(`[Gemini] Calling ${modelName}...`);
    const result = await model.generateContent([RECEIPT_EXTRACTION_PROMPT, imagePart]);
    const responseText = result.response.text();
    console.log(`[Gemini] ${modelName} returned successfully`);
    const parsed = parseGeminiResponse(responseText);
    // Tag the response with model name for debugging
    parsed.rawText = `[Extracted by ${modelName}]\n${responseText}`;
    return parsed;
  } catch (error) {
    console.error(`Gemini API error (${modelName}):`, error);
    throw new Error(`Failed to extract receipt data with ${modelName}`);
  }
}

/**
 * Parse and validate Gemini API response
 */
function parseGeminiResponse(responseText: string): GeminiExtractionResponse {
  try {
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(jsonText);

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
    console.error('Failed to parse Gemini response:', error);
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
