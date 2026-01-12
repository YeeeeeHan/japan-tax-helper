// Claude Strategy for Japanese Receipt OCR
//
// Supports multiple Claude models:
// - claude-3-5-sonnet-20241022: Best for document OCR (recommended)
// - claude-sonnet-4-20250514: Newer model, good general performance
// - claude-opus-4-20250514: Most capable, highest cost
//
// Claude 3.5 Sonnet is widely considered the best for Japanese OCR tasks,
// particularly for spatial reasoning (understanding that a price listed
// far to the right belongs to the item on the left).
//
// Cost: ~$3-5 per 1,000 images
// Quality: Highest for Japanese receipts

import type { GeminiExtractionResponse, ExtractedData } from '@/types/receipt';
import { RECEIPT_EXTRACTION_PROMPT } from '../prompts';

// Model selection - can be overridden via CLAUDE_MODEL env var
// Available models:
// - claude-sonnet-4-20250514: Latest Sonnet (default)
// - claude-opus-4-20250514: Most capable
// - claude-3-5-sonnet-latest: Claude 3.5 Sonnet (alias)
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

// Use the exact same prompt as Gemini for consistent results
// The prompt is defined in prompts.ts and shared across all strategies

/**
 * Extract receipt data using Claude 3.5 Sonnet
 * Cost: ~$3-5 per 1,000 images
 * Quality: Highest for Japanese receipts
 */
export async function extractWithClaude(
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<GeminiExtractionResponse> {
  console.log('[Claude] Starting extraction...');
  console.log(`[Claude] Image size: ${imageBase64.length} chars, type: ${mimeType}`);

  const Anthropic = (await import('@anthropic-ai/sdk')).default;

  const client = new Anthropic({
    apiKey: apiKey,
  });

  try {
    console.log(`[Claude] Calling messages.create with model: ${CLAUDE_MODEL}`);
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,  // Increased for detailed extraction
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: RECEIPT_EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    // Extract text content from response
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    return parseClaudeResponse(textContent.text);
  } catch (error: unknown) {
    console.error('Claude API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract receipt data with Claude: ${message}`);
  }
}

/**
 * Parse and validate Claude API response
 */
function parseClaudeResponse(responseText: string): GeminiExtractionResponse {
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

    const extractedData: ExtractedData = {
      issuerName: parsed.issuerName || '',
      tNumber: parsed.tNumber || null,
      transactionDate: new Date(parsed.transactionDate),
      description: parsed.description || '',
      subtotalExcludingTax: parsed.subtotalExcludingTax || 0,
      taxBreakdown: parsed.taxBreakdown || [],
      totalAmount: parsed.totalAmount || 0,
      suggestedCategory: parsed.suggestedCategory || '未分類',
      categoryConfidence: parsed.categoryConfidence || 0,
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
      rawText: `[Extracted by ${CLAUDE_MODEL}]\n${responseText}`,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    console.error('Failed to parse Claude response:', error);
    throw new Error('Invalid response format from Claude');
  }
}

function calculateOverallConfidence(fieldConfidences: Record<string, number>): number {
  const weights: Record<string, number> = {
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
