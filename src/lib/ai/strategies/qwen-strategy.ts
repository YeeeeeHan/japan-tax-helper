// Qwen2.5-VL Strategy (Hosted APIs)
//
// Qwen2.5-VL is an open-weights vision-language model from Alibaba.
// It has excellent CJK support and can be accessed via hosted API providers:
// - DeepInfra: https://deepinfra.com
// - Fireworks: https://fireworks.ai
// - Together AI: https://together.ai
//
// Cost: ~$0.5-1 per 1,000 images (hosted)
// Quality: Good, near GPT-4o for document parsing

import type { GeminiExtractionResponse, ExtractedData } from '@/types/receipt';
import { RECEIPT_EXTRACTION_PROMPT } from '../prompts';

// Supported hosting providers with their configurations
type QwenProvider = 'deepinfra' | 'fireworks' | 'together';

interface ProviderConfig {
  endpoint: string;
  defaultModel: string;
  authHeader: string;
}

const PROVIDER_CONFIGS: Record<QwenProvider, ProviderConfig> = {
  deepinfra: {
    endpoint: 'https://api.deepinfra.com/v1/openai/chat/completions',
    defaultModel: 'Qwen/Qwen2.5-VL-72B-Instruct',
    authHeader: 'Authorization',
  },
  fireworks: {
    endpoint: 'https://api.fireworks.ai/inference/v1/chat/completions',
    defaultModel: 'accounts/fireworks/models/qwen2-vl-72b-instruct',
    authHeader: 'Authorization',
  },
  together: {
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    defaultModel: 'Qwen/Qwen2.5-VL-72B-Instruct',
    authHeader: 'Authorization',
  },
};

// Use the shared prompt from prompts.ts for consistent results across all strategies

/**
 * Detect which provider to use based on environment variables
 */
function detectProvider(): { provider: QwenProvider; apiKey: string } | null {
  // Check each provider in order of preference
  if (process.env.DEEPINFRA_API_KEY) {
    return { provider: 'deepinfra', apiKey: process.env.DEEPINFRA_API_KEY };
  }
  if (process.env.FIREWORKS_API_KEY) {
    return { provider: 'fireworks', apiKey: process.env.FIREWORKS_API_KEY };
  }
  if (process.env.TOGETHER_API_KEY) {
    return { provider: 'together', apiKey: process.env.TOGETHER_API_KEY };
  }
  // Legacy env var support
  if (process.env.QWEN_VL_API_KEY && process.env.QWEN_VL_ENDPOINT) {
    // Detect provider from endpoint
    const endpoint = process.env.QWEN_VL_ENDPOINT;
    if (endpoint.includes('deepinfra')) {
      return { provider: 'deepinfra', apiKey: process.env.QWEN_VL_API_KEY };
    }
    if (endpoint.includes('fireworks')) {
      return { provider: 'fireworks', apiKey: process.env.QWEN_VL_API_KEY };
    }
    if (endpoint.includes('together')) {
      return { provider: 'together', apiKey: process.env.QWEN_VL_API_KEY };
    }
  }
  return null;
}

/**
 * Extract receipt data using Qwen2.5-VL via hosted API
 * Cost: ~$0.5-1 per 1,000 images
 * Quality: Good, near GPT-4o for document parsing
 */
export async function extractWithQwenVL(
  imageBase64: string,
  mimeType: string
): Promise<GeminiExtractionResponse> {
  const detected = detectProvider();

  if (!detected) {
    throw new Error(
      'Qwen VL not configured. Set one of the following API keys:\n\n' +
        '1. DEEPINFRA_API_KEY - https://deepinfra.com (Recommended)\n' +
        '2. FIREWORKS_API_KEY - https://fireworks.ai\n' +
        '3. TOGETHER_API_KEY - https://together.ai\n\n' +
        'Example:\n' +
        'DEEPINFRA_API_KEY=your-api-key'
    );
  }

  const { provider, apiKey } = detected;
  const config = PROVIDER_CONFIGS[provider];

  // Allow custom endpoint override
  const endpoint = process.env.QWEN_VL_ENDPOINT || config.endpoint;
  // Allow custom model override
  const model = process.env.QWEN_VL_MODEL || config.defaultModel;

  try {
    // Qwen VL uses OpenAI-compatible API format
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [config.authHeader]: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                },
              },
              {
                type: 'text',
                text: RECEIPT_EXTRACTION_PROMPT,
              },
            ],
          },
        ],
        max_tokens: 2048,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${provider} API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error(`Empty response from ${provider}`);
    }

    return parseQwenResponse(content);
  } catch (error: unknown) {
    console.error(`Qwen VL error (${provider}):`, error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Qwen VL extraction failed: ${message}`);
  }
}

/**
 * Parse Qwen VL response
 */
function parseQwenResponse(responseText: string): GeminiExtractionResponse {
  try {
    // Remove markdown code blocks if present
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(jsonText);

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

    const confidence = parsed.confidence || {
      issuerName: 0.7,
      tNumber: parsed.tNumber ? 0.8 : 0,
      transactionDate: 0.8,
      totalAmount: 0.8,
      taxBreakdown: 0.7,
      category: 0.6,
    };

    const overallConfidence = calculateOverallConfidence(confidence);

    const warnings: string[] = [];
    if (!parsed.tNumber) {
      warnings.push('T-Number not found on receipt');
    }
    if (confidence.totalAmount < 0.8) {
      warnings.push('Total amount has low confidence');
    }

    return {
      extractedData,
      confidence: {
        overall: overallConfidence,
        fields: confidence,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    console.error('Failed to parse Qwen VL response:', error);
    throw new Error('Invalid response format from Qwen VL');
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

/**
 * Check if Qwen VL is configured and available
 */
export function isQwenVLAvailable(): boolean {
  return detectProvider() !== null;
}

/**
 * Get the configured Qwen VL provider info
 */
export function getQwenVLProviderInfo(): { provider: string; model: string } | null {
  const detected = detectProvider();
  if (!detected) return null;

  const config = PROVIDER_CONFIGS[detected.provider];
  return {
    provider: detected.provider,
    model: process.env.QWEN_VL_MODEL || config.defaultModel,
  };
}
