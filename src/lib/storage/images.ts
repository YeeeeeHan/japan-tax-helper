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
 * HEIC files are stored as-is (server will convert them during processing)
 */
export async function compressImage(
  file: File,
  maxDimension: number = IMAGE_COMPRESSION.MAX_DIMENSION,
  quality: number = IMAGE_COMPRESSION.QUALITY
): Promise<Blob> {
  // For HEIC files, store as-is - server will convert during processing
  // Browser cannot display HEIC, but we need to keep original for API
  if (isHeicFile(file)) {
    return file;
  }

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

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Store a compressed image in IndexedDB
 */
export async function storeImage(file: File, imageId: string): Promise<string> {
  // Compress the image first (HEIC files stored as-is)
  const compressedBlob = await compressImage(file);

  // Store in IndexedDB
  await db.images.add({
    id: imageId,
    blob: compressedBlob,
  });

  return imageId;
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
