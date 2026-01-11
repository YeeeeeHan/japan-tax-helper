import { db } from '../db/schema';
import { IMAGE_COMPRESSION } from '../utils/constants';

/**
 * Compress an image file using Canvas API
 */
export async function compressImage(
  file: File,
  maxDimension: number = IMAGE_COMPRESSION.MAX_DIMENSION,
  quality: number = IMAGE_COMPRESSION.QUALITY
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
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Store a compressed image in IndexedDB
 */
export async function storeImage(file: File, imageId: string): Promise<string> {
  // Compress the image first
  const compressedBlob = await compressImage(file);

  // Store in IndexedDB
  await db.images.add({
    id: imageId,
    blob: compressedBlob,
  });

  return imageId;
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
