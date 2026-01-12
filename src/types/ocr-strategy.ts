// OCR Strategy Types for Development Testing
// This is a dev-only feature to compare different OCR approaches

export type OCRStrategy =
  | 'gemini-2.0-flash'      // Current: Good quality, ~$10/1k images
  | 'gemini-1.5-flash'      // Cheaper: 70% cost reduction, ~$3/1k images
  | 'claude-sonnet'         // Best for Japanese: Excellent spatial reasoning, ~$4/1k images
  | 'paddle-ocr'            // Free: Self-hosted, good for Japanese (requires GPU)
  | 'confidence-routing'    // Hybrid: PaddleOCR first, expensive model for low confidence
  | 'qwen-vl';              // Mid-range: Open-weights VLM via hosted APIs, ~$1/1k images

export interface OCRStrategyConfig {
  id: OCRStrategy;
  name: string;
  description: string;
  costPerImage: string;
  quality: 'high' | 'medium' | 'low';
  isImplemented: boolean;
  pros: string[];
  cons: string[];
}

export const OCR_STRATEGIES: OCRStrategyConfig[] = [
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'End-to-end VLM extraction. Good quality, moderate cost.',
    costPerImage: '~$0.01',
    quality: 'high',
    isImplemented: true,
    pros: [
      'Good accuracy for Japanese receipts',
      'Handles vertical text well',
      'Direct JSON output',
      'No pipeline complexity',
    ],
    cons: [
      'Higher cost than alternatives',
      'API dependency',
    ],
  },
  {
    id: 'claude-sonnet',
    name: 'Claude Sonnet (Best for Japanese)',
    description: 'Best spatial reasoning for Japanese receipts. Recommended for accuracy.',
    costPerImage: '~$0.004',
    quality: 'high',
    isImplemented: true,
    pros: [
      'Best accuracy for Japanese receipts',
      'Excellent spatial reasoning',
      'Handles complex layouts (vertical/horizontal mix)',
      'Good with faded/thermal receipts',
    ],
    cons: [
      'Requires separate API key (ANTHROPIC_API_KEY)',
      'Slightly slower than Gemini',
    ],
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash (Budget)',
    description: 'Previous generation. 70% cheaper, slightly lower quality.',
    costPerImage: '~$0.003',
    quality: 'medium',
    isImplemented: true,
    pros: [
      '70% cost reduction',
      'Still good quality',
      'Same API, easy switch',
    ],
    cons: [
      'May struggle with faded receipts',
      'Lower accuracy on edge cases',
    ],
  },
  {
    id: 'paddle-ocr',
    name: 'PaddleOCR (Free)',
    description: 'Open-source OCR by Baidu. Best free option for CJK.',
    costPerImage: '$0 (self-hosted)',
    quality: 'medium',
    isImplemented: false,
    pros: [
      'Completely free',
      'Excellent Japanese support',
      'Handles vertical text',
      'Returns confidence scores',
    ],
    cons: [
      'Requires server with GPU for speed',
      'Returns raw text, needs parsing',
      'More complex pipeline',
    ],
  },
  {
    id: 'confidence-routing',
    name: 'Confidence Routing (Hybrid)',
    description: 'PaddleOCR first, route low-confidence to Gemini.',
    costPerImage: '~$0.002 avg',
    quality: 'high',
    isImplemented: false,
    pros: [
      'Best cost/quality balance',
      'Only pays for difficult receipts',
      '80-90% handled by free OCR',
    ],
    cons: [
      'Most complex implementation',
      'Requires PaddleOCR server',
      'Two-step latency for some receipts',
    ],
  },
  {
    id: 'qwen-vl',
    name: 'Qwen2.5-VL (Hosted API)',
    description: 'Alibaba VLM via DeepInfra/Fireworks/Together. Cheapest option.',
    costPerImage: '~$0.001',
    quality: 'medium',
    isImplemented: true,
    pros: [
      'Cheapest option (~$1/1k images)',
      'Good CJK support (Alibaba)',
      'Multiple hosting providers',
      'No GPU required (API-based)',
    ],
    cons: [
      'Slightly lower accuracy than Claude/Gemini',
      'Requires third-party API key',
      'May have rate limits',
    ],
  },
];

export interface StrategyTestResult {
  strategy: OCRStrategy;
  imageId: string;
  processingTime: number; // ms
  apiCost: number; // estimated USD
  extractedData: any;
  confidence: number;
  rawResponse?: string;
  errors?: string[];
}

// Storage key for dev settings
export const DEV_STRATEGY_STORAGE_KEY = 'dev_ocr_strategy';

// Default strategy
export const DEFAULT_OCR_STRATEGY: OCRStrategy = 'gemini-2.0-flash';
