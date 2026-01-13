import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Helper to create a mock receipt image file
 */
export function createMockReceiptFile(fileName: string = 'test-receipt.jpg'): Buffer {
  // Create a simple 1x1 pixel PNG (smallest valid image)
  // This is a base64-encoded 1x1 red pixel PNG
  const base64Image =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
  return Buffer.from(base64Image, 'base64');
}

/**
 * Helper to upload receipts on the upload page
 */
export async function uploadReceipts(
  page: Page,
  count: number = 1
): Promise<void> {
  // Navigate to upload page
  await page.goto('/upload');

  // Wait for the dropzone to be visible
  await page.waitForSelector('input[type="file"]', { state: 'attached' });

  // Create mock files
  const files: Array<{ name: string; mimeType: string; buffer: Buffer }> = [];
  for (let i = 0; i < count; i++) {
    files.push({
      name: `test-receipt-${i + 1}.jpg`,
      mimeType: 'image/jpeg',
      buffer: createMockReceiptFile(),
    });
  }

  // Upload files
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(
    files.map((file) => ({
      name: file.name,
      mimeType: file.mimeType,
      buffer: file.buffer,
    }))
  );

  // Wait for files to appear in the UI
  await page.waitForSelector(`text=${files.length} files`, { timeout: 5000 });
}

/**
 * Helper to get receipt count from the dashboard
 */
export async function getReceiptCounts(page: Page): Promise<{
  total: number;
  needsReview: number;
  done: number;
}> {
  await page.goto('/dashboard');

  // Wait for the filter tabs to load
  await page.waitForSelector('button:has-text("All")', { timeout: 10000 });

  // Extract counts from filter buttons
  const allButton = page.locator('button', { hasText: 'All' });
  const reviewButton = page.locator('button', { hasText: 'Review' });
  const doneButton = page.locator('button', { hasText: 'Done' });

  const allText = await allButton.textContent();
  const reviewText = await reviewButton.textContent();

  // Parse counts using regex
  const totalMatch = allText?.match(/\((\d+)\)/);
  const reviewMatch = reviewText?.match(/\((\d+)\)/);

  return {
    total: totalMatch ? parseInt(totalMatch[1], 10) : 0,
    needsReview: reviewMatch ? parseInt(reviewMatch[1], 10) : 0,
    done: 0, // Will implement if needed
  };
}

/**
 * Helper to wait for processing to complete
 */
export async function waitForProcessingComplete(
  page: Page,
  timeout: number = 60000
): Promise<void> {
  // Wait for "Process Files" button to disappear or change to "Go to Dashboard"
  await page.waitForSelector(
    'button:has-text("Go to Dashboard"), button:has-text("Processing")',
    { timeout, state: 'hidden' }
  ).catch(() => {
    // If timeout, check if there's a "Go to Dashboard" button
    return page.waitForSelector('button:has-text("Go to Dashboard")', { timeout: 5000 });
  });
}

/**
 * Helper to clear IndexedDB (reset state between tests)
 */
export async function clearIndexedDB(page: Page): Promise<void> {
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const databases = ['receipts-db'];
      let pending = databases.length;

      databases.forEach((dbName) => {
        const request = indexedDB.deleteDatabase(dbName);
        request.onsuccess = () => {
          pending--;
          if (pending === 0) resolve();
        };
        request.onerror = () => {
          pending--;
          if (pending === 0) resolve();
        };
      });
    });
  });
}

/**
 * Helper to navigate using keyboard
 */
export async function navigateReceiptsWithKeyboard(
  page: Page,
  direction: 'up' | 'down',
  count: number = 1
): Promise<void> {
  const key = direction === 'up' ? 'ArrowUp' : 'ArrowDown';
  for (let i = 0; i < count; i++) {
    await page.keyboard.press(key);
    await page.waitForTimeout(100); // Small delay between presses
  }
}

/**
 * Helper to select receipts using keyboard
 */
export async function selectReceiptsWithKeyboard(
  page: Page,
  count: number
): Promise<void> {
  // Click "Select" button to enter select mode
  await page.click('button:has-text("Select")');

  // Wait for checkboxes to appear
  await page.waitForSelector('input[type="checkbox"]');

  // Navigate and select using Space key
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
  }
}
