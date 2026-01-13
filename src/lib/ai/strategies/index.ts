// OCR Strategy implementations
// This module provides different extraction strategies for testing

import type { GeminiExtractionResponse } from '@/types/receipt';
import type { OCRStrategy } from '@/types/ocr-strategy';
import {
  extractWithGemini25Flash,
  extractWithGemini25FlashLite,
  extractWithGemini20Flash,
  extractWithGemini15Flash
} from './gemini-strategies';
import { extractWithPaddleOCR } from './paddle-strategy';
import { extractWithConfidenceRouting } from './confidence-routing';
import { extractWithQwenVL } from './qwen-strategy';
import { extractWithClaude } from './claude-strategy';

export interface ExtractionResult extends GeminiExtractionResponse {
  strategy: OCRStrategy;
  processingTimeMs: number;
  estimatedCost: number;
}

export async function extractWithStrategy(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  strategy: OCRStrategy
): Promise<ExtractionResult> {
  const startTime = Date.now();

  console.log(`[Strategy] Executing strategy: ${strategy}`);

  let result: GeminiExtractionResponse;
  let estimatedCost: number;

  switch (strategy) {
    case 'gemini-2.5-flash':
      result = await extractWithGemini25Flash(imageBase64, mimeType, apiKey);
      estimatedCost = 0.0016;
      break;

    case 'gemini-2.5-flash-lite':
      result = await extractWithGemini25FlashLite(imageBase64, mimeType, apiKey);
      estimatedCost = 0.0005;
      break;

    case 'gemini-2.0-flash':
      result = await extractWithGemini20Flash(imageBase64, mimeType, apiKey);
      estimatedCost = 0.01;
      break;

    case 'gemini-1.5-flash':
      result = await extractWithGemini15Flash(imageBase64, mimeType, apiKey);
      estimatedCost = 0.003;
      break;

    case 'claude-sonnet':
      // Claude requires ANTHROPIC_API_KEY env var
      const claudeApiKey = process.env.ANTHROPIC_API_KEY;
      console.log(`[Strategy] Claude: API key present = ${!!claudeApiKey}`);
      if (!claudeApiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required for Claude strategy');
      }
      console.log('[Strategy] Calling Claude API...');
      result = await extractWithClaude(imageBase64, mimeType, claudeApiKey);
      console.log('[Strategy] Claude API returned successfully');
      estimatedCost = 0.004; // ~$4/1k images
      break;

    case 'paddle-ocr':
      result = await extractWithPaddleOCR(imageBase64, mimeType);
      estimatedCost = 0;
      break;

    case 'confidence-routing':
      const routingResult = await extractWithConfidenceRouting(imageBase64, mimeType, apiKey);
      result = routingResult.result;
      estimatedCost = routingResult.estimatedCost;
      break;

    case 'qwen-vl':
      result = await extractWithQwenVL(imageBase64, mimeType);
      estimatedCost = 0.001;
      break;

    default:
      // Fallback to Gemini 2.5 Flash (stable, recommended)
      console.warn(`[Strategy] Unknown strategy "${strategy}", using default: gemini-2.5-flash`);
      result = await extractWithGemini25Flash(imageBase64, mimeType, apiKey);
      estimatedCost = 0.0016;
  }

  const processingTimeMs = Date.now() - startTime;

  return {
    ...result,
    strategy,
    processingTimeMs,
    estimatedCost,
  };
}
