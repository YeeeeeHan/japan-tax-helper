// OCR Strategy Types for Development Testing
// This is a dev-only feature to compare different OCR approaches

export type OCRStrategy =
  | 'gemini-2.5-flash'      // Recommended: Latest stable, 84% cheaper, ~$1.6/1k images
  | 'gemini-2.5-flash-lite' // Budget: Ultra-fast, 95% cheaper, ~$0.5/1k images
  | 'gemini-2.0-flash'      // DEPRECATED (retires Mar 3, 2026): Use gemini-2.5-flash instead
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
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash (Recommended)',
    description: 'Latest stable model. Best quality, 84% cheaper than 2.0.',
    costPerImage: '~$0.0016',
    quality: 'high',
    isImplemented: true,
    pros: [
      'Latest stable model (no deprecation risk)',
      '84% cheaper than Gemini 2.0',
      'Excellent Japanese OCR accuracy',
      'Direct JSON output',
      'No pipeline complexity',
    ],
    cons: [
      'API dependency',
    ],
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite (Budget)',
    description: 'Ultra-fast, ultra-cheap. 95% cost reduction vs 2.0.',
    costPerImage: '~$0.0005',
    quality: 'medium',
    isImplemented: true,
    pros: [
      '95% cheaper than Gemini 2.0',
      'Fastest processing time',
      'Good enough for clear receipts',
      'Direct JSON output',
    ],
    cons: [
      'Lower accuracy on faded/complex receipts',
      'API dependency',
    ],
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash (DEPRECATED)',
    description: '⚠️ RETIRES MARCH 3, 2026 - Use gemini-2.5-flash instead',
    costPerImage: '~$0.01',
    quality: 'high',
    isImplemented: true,
    pros: [
      'Good accuracy for Japanese receipts',
      'Handles vertical text well',
    ],
    cons: [
      '⚠️ WILL BE RETIRED MARCH 3, 2026',
      'Higher cost than 2.5 Flash',
      'Use gemini-2.5-flash instead',
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

// Default strategy (updated to 2.5 Flash - stable, cheaper, no deprecation)
export const DEFAULT_OCR_STRATEGY: OCRStrategy = 'gemini-2.5-flash';
