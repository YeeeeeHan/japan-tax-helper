// Gemini Vision API client for receipt extraction
// Note: This runs on the server side (API route) to keep API key secure

import type { GeminiExtractionResponse } from '@/types/receipt';
import { RECEIPT_EXTRACTION_PROMPT } from './prompts';

/**
 * Extract receipt data using Gemini Vision API
 * This is called from the API route (/api/extract)
 */
export async function extractReceiptData(
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<GeminiExtractionResponse> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0.1, // Low temperature for factual extraction
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json', // Request JSON response
    },
  });

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType: mimeType,
    },
  };

  try {
    const result = await model.generateContent([RECEIPT_EXTRACTION_PROMPT, imagePart]);

    const responseText = result.response.text();

    // Parse and validate the JSON response
    const extractedData = parseGeminiResponse(responseText);

    return extractedData;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to extract receipt data');
  }
}

/**
 * Parse and validate Gemini API response
 */
function parseGeminiResponse(responseText: string): GeminiExtractionResponse {
  try {
    // Remove markdown code blocks if present
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(jsonText);

    // Validate required fields
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

    // Convert date string to Date object
    const extractedData = {
      ...parsed,
      transactionDate: new Date(parsed.transactionDate),
    };

    // Calculate overall confidence
    const overallConfidence = calculateOverallConfidence(parsed.confidence);

    const warnings: string[] = [];

    // Add warnings for low confidence fields (with null checks)
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

/**
 * Calculate overall confidence score with weighted fields
 */
function calculateOverallConfidence(fieldConfidences: any): number {
  const weights = {
    issuerName: 1.0,
    tNumber: 2.0, // Critical for tax compliance
    transactionDate: 1.5,
    totalAmount: 2.0, // Critical for accounting
    taxBreakdown: 1.5,
    category: 0.5, // Less critical, user can change
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [field, weight] of Object.entries(weights)) {
    if (field in fieldConfidences) {
      weightedSum += fieldConfidences[field] * weight;
      totalWeight += weight;
    }
  }

  return weightedSum / totalWeight;
}
