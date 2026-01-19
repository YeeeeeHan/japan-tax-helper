import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import heicConvert from 'heic-convert';
import { extractWithStrategy } from '@/lib/ai/strategies';
import { validateReceiptData, needsReview } from '@/lib/validation/receipt';
import { extractLimiter } from '@/lib/utils/rate-limit';
import { withRetry } from '@/lib/utils/retry';
import type { OCRStrategy } from '@/types/ocr-strategy';
import { OCR_STRATEGIES, DEFAULT_OCR_STRATEGY } from '@/types/ocr-strategy';

/**
 * Check if file is HEIC format
 */
function isHeicFile(mimeType: string, fileName: string): boolean {
  if (mimeType === 'image/heic' || mimeType === 'image/heif') {
    return true;
  }
  const name = fileName.toLowerCase();
  return name.endsWith('.heic') || name.endsWith('.heif');
}

/**
 * Convert HEIC buffer to JPEG using heic-convert
 */
async function convertHeicToJpeg(inputBuffer: Buffer): Promise<Buffer> {
  const outputBuffer = await heicConvert({
    buffer: inputBuffer,
    format: 'JPEG',
    quality: 0.85,
  });
  return Buffer.from(outputBuffer);
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Rate limit: requests per minute per IP
// Default: 100 RPM (paid tier) - change to 5 for free tier
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'anonymous';

    // Check rate limit
    try {
      await extractLimiter.check(RATE_LIMIT, ip);
    } catch {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const strategyParam = formData.get('strategy') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: JPG, PNG, HEIC, PDF' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size: 10MB' },
        { status: 400 }
      );
    }

    // Determine which strategy to use
    // Priority: 1) Dev mode form param, 2) OCR_STRATEGY env var, 3) hardcoded default
    const envStrategy = process.env.OCR_STRATEGY as OCRStrategy | undefined;
    let strategy: OCRStrategy = DEFAULT_OCR_STRATEGY;

    // In development, allow strategy param from client (for testing UI)
    if (isDevelopment && strategyParam) {
      const validStrategy = OCR_STRATEGIES.find(s => s.id === strategyParam);
      if (validStrategy) {
        strategy = validStrategy.id;
        console.log(`[DEV] Using client-requested strategy: ${strategy}`);
      }
    }
    // In production (or dev without param), use env var if set
    else if (envStrategy) {
      const validStrategy = OCR_STRATEGIES.find(s => s.id === envStrategy);
      if (validStrategy) {
        strategy = validStrategy.id;
        console.log(`[INFO] Using env-configured strategy: ${strategy}`);
      } else {
        console.warn(`[WARN] Invalid OCR_STRATEGY env "${envStrategy}", using default: ${DEFAULT_OCR_STRATEGY}`);
      }
    }

    console.log(`[Strategy] Using: ${strategy}`);

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(bytes);
    let mimeType = file.type;
    let convertedImageBase64: string | null = null;

    // Convert HEIC to JPEG for processing and display
    if (isHeicFile(file.type, file.name)) {
      console.log('[HEIC] Converting HEIC to JPEG...');
      try {
        buffer = await convertHeicToJpeg(buffer) as Buffer;
        mimeType = 'image/jpeg';
        // Return the converted image so client can store it for display
        convertedImageBase64 = buffer.toString('base64');
        console.log('[HEIC] Conversion successful');
      } catch (error: any) {
        console.error('[HEIC] Conversion failed:', error.message);
        return NextResponse.json(
          { error: 'Failed to convert HEIC image. Please try converting to JPEG before uploading.' },
          { status: 400 }
        );
      }
    }

    const base64 = buffer.toString('base64');

    // Extract data using selected strategy with automatic retry on transient failures
    const extractionResult = await withRetry(
      () => extractWithStrategy(base64, mimeType, apiKey, strategy),
      {
        maxRetries: 3,
        initialDelayMs: 2000,
        retryableStatusCodes: [429, 500, 503],
        onRetry: (attempt, error, delayMs) => {
          console.log(
            `[API Route] Extraction failed (attempt ${attempt}/3). Retrying in ${delayMs}ms...`,
            error.message || error
          );
        },
      }
    );

    // Validate the extracted data
    const validationResult = validateReceiptData(extractionResult.extractedData);

    // Determine if needs review
    const flagForReview = needsReview(extractionResult.confidence, validationResult);

    // Combine warnings
    const allWarnings = [
      ...(extractionResult.warnings || []),
      ...validationResult.warnings,
    ];

    // Build response
    const response: any = {
      success: true,
      data: {
        extractedData: extractionResult.extractedData,
        confidence: extractionResult.confidence,
        needsReview: flagForReview,
        validation: {
          isValid: validationResult.isValid,
          errors: validationResult.errors,
          warnings: allWarnings,
        },
        // Include converted image for HEIC files so client can display them
        ...(convertedImageBase64 && { convertedImage: convertedImageBase64 }),
      },
    };

    // Include strategy metadata in development mode
    if (isDevelopment) {
      response.data._dev = {
        strategy: extractionResult.strategy,
        processingTimeMs: extractionResult.processingTimeMs,
        estimatedCost: extractionResult.estimatedCost,
      };
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Receipt extraction error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process receipt',
      },
      { status: 500 }
    );
  }
}
