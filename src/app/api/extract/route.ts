import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { extractReceiptData } from '@/lib/ai/gemini';
import { validateReceiptData, needsReview } from '@/lib/validation/receipt';
import { extractLimiter } from '@/lib/utils/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Rate limit: requests per minute per IP
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT_MAX || '10', 10);

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

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    // Extract data using Gemini Vision API
    const geminiResponse = await extractReceiptData(base64, file.type, apiKey);

    // Validate the extracted data
    const validationResult = validateReceiptData(geminiResponse.extractedData);

    // Determine if needs review
    const flagForReview = needsReview(geminiResponse.confidence, validationResult);

    // Combine warnings
    const allWarnings = [
      ...(geminiResponse.warnings || []),
      ...validationResult.warnings,
    ];

    return NextResponse.json({
      success: true,
      data: {
        extractedData: geminiResponse.extractedData,
        confidence: geminiResponse.confidence,
        needsReview: flagForReview,
        validation: {
          isValid: validationResult.isValid,
          errors: validationResult.errors,
          warnings: allWarnings,
        },
      },
    });
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
