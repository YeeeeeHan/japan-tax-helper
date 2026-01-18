import { NextRequest, NextResponse } from 'next/server';
import heicConvert from 'heic-convert';

export const runtime = 'nodejs';

/**
 * POST /api/preview
 * Converts HEIC images to JPEG for preview
 * Used when client-side heic2any conversion fails
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Convert HEIC to JPEG using heic-convert
    const outputBuffer = await heicConvert({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: 0.8,
    });

    // Convert to base64 for easy client-side consumption
    const base64 = Buffer.from(outputBuffer).toString('base64');

    return NextResponse.json({
      success: true,
      image: base64,
      mimeType: 'image/jpeg',
    });
  } catch (error: any) {
    console.error('[Preview API] Error converting HEIC:', error);
    return NextResponse.json(
      { error: 'Failed to convert image', details: error.message },
      { status: 500 }
    );
  }
}
