import { db } from '../db/schema';
import { IMAGE_COMPRESSION } from '../utils/constants';

/**
 * Check if a file is HEIC format
 */
export function isHeicFile(file: File | Blob): boolean {
  // Check MIME type
  if (file.type === 'image/heic' || file.type === 'image/heif') {
    return true;
  }
  // Check file extension for File objects
  if (file instanceof File) {
    const name = file.name.toLowerCase();
    return name.endsWith('.heic') || name.endsWith('.heif');
  }
  return false;
}

/**
 * Convert HEIC blob to JPEG using heic2any (browser-side)
 * Uses dynamic import to avoid SSR issues
 * Note: heic2any doesn't support all HEIC variants - returns null on failure
 */
export async function convertHeicToJpeg(file: File | Blob): Promise<Blob | null> {
  try {
    // Dynamic import to avoid window reference during SSR
    const heic2any = (await import('heic2any')).default;

    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: IMAGE_COMPRESSION.QUALITY,
    });

    // heic2any can return array if multiple images, we take the first
    return Array.isArray(result) ? result[0] : result;
  } catch (error) {
    // heic2any doesn't support all HEIC variants (especially newer iOS formats)
    console.warn('[HEIC] Client-side conversion failed, will use server-side conversion:', error);
    return null;
  }
}

/**
 * Convert base64 string to Blob
 */
export function base64ToBlob(base64: string, mimeType: string = 'image/jpeg'): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Compress an image file using Canvas API
 * HEIC files are converted to JPEG first, then compressed
 * Returns { blob, needsServerConversion } - if needsServerConversion is true, the blob is the original HEIC
 */
export async function compressImage(
  file: File,
  maxDimension: number = IMAGE_COMPRESSION.MAX_DIMENSION,
  quality: number = IMAGE_COMPRESSION.QUALITY
): Promise<{ blob: Blob; needsServerConversion: boolean }> {
  // Handle HEIC files
  if (isHeicFile(file)) {
    console.log('[HEIC] Attempting client-side conversion...');
    const convertedBlob = await convertHeicToJpeg(file);

    if (convertedBlob) {
      console.log('[HEIC] Client-side conversion successful, size:', convertedBlob.size);
      // Compress the converted JPEG
      const compressed = await compressImageBlob(convertedBlob, maxDimension, quality);
      return { blob: compressed, needsServerConversion: false };
    } else {
      // Client-side conversion failed, store original HEIC for server-side conversion
      console.log('[HEIC] Storing original for server-side conversion');
      return { blob: file, needsServerConversion: true };
    }
  }

  // For non-HEIC images, compress normally
  const compressed = await compressImageBlob(file, maxDimension, quality);
  return { blob: compressed, needsServerConversion: false };
}

/**
 * Internal helper to compress an image blob using Canvas
 */
async function compressImageBlob(
  imageBlob: Blob,
  maxDimension: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // Calculate dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > height && width > maxDimension) {
        height = (height / width) * maxDimension;
        width = maxDimension;
      } else if (height > maxDimension) {
        width = (width / height) * maxDimension;
        height = maxDimension;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Image compression failed'));
          }
        },
        IMAGE_COMPRESSION.FORMAT,
        quality
      );

      // Clean up
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(imageBlob);
  });
}

/**
 * Store a compressed image in IndexedDB
 * Returns { imageId, needsServerConversion } - if needsServerConversion is true, HEIC needs server-side conversion for preview
 */
export async function storeImage(file: File, imageId: string): Promise<{ imageId: string; needsServerConversion: boolean }> {
  // Compress the image first (HEIC files may need server-side conversion)
  const { blob, needsServerConversion } = await compressImage(file);

  // Store in IndexedDB
  await db.images.add({
    id: imageId,
    blob: blob,
  });

  return { imageId, needsServerConversion };
}

/**
 * Update an existing stored image with a new blob (e.g., after server-side HEIC conversion)
 */
export async function updateStoredImage(imageId: string, newBlob: Blob): Promise<void> {
  await db.images.update(imageId, { blob: newBlob });
}

/**
 * Retrieve an image from IndexedDB and create a blob URL
 */
export async function getImageUrl(imageId: string): Promise<string | null> {
  const imageData = await db.images.get(imageId);
  if (!imageData) return null;

  return URL.createObjectURL(imageData.blob);
}

/**
 * Get image blob from IndexedDB
 */
export async function getImageBlob(imageId: string): Promise<Blob | null> {
  const imageData = await db.images.get(imageId);
  return imageData?.blob || null;
}

/**
 * Delete an image from IndexedDB
 */
export async function deleteImage(imageId: string): Promise<void> {
  await db.images.delete(imageId);
}

/**
 * Convert blob to base64 for API submission or export
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert blob to buffer for API submission
 */
export async function blobToBuffer(blob: Blob): Promise<ArrayBuffer> {
  return await blob.arrayBuffer();
}
