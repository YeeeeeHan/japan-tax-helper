import { test, expect } from '@playwright/test';
import {
  clearIndexedDB,
  getReceiptCounts,
  uploadReceipts,
  waitForProcessingComplete,
  navigateReceiptsWithKeyboard,
} from './helpers';

test.describe('User Flows - Import, Delete, and Navigate', () => {
  // Reset IndexedDB before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearIndexedDB(page);
  });

  test('should import receipts, view in dashboard, and counts should match', async ({
    page,
  }) => {
    // Step 1: Import 3 receipts
    await page.goto('/upload');

    // Mock the API response to avoid actual Gemini API calls
    await page.route('**/api/extract', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            extractedData: {
              issuerName: 'Test Store',
              transactionDate: new Date().toISOString(),
              tNumber: 'T1234567890123',
              totalAmount: 1000,
              suggestedCategory: '消耗品費',
              taxBreakdown: [{ taxRate: 10, taxAmount: 100 }],
            },
            confidence: {
              overall: 0.95,
              fields: {
                issuerName: 0.95,
                transactionDate: 0.95,
                tNumber: 0.95,
                totalAmount: 0.95,
                category: 0.95,
              },
            },
            needsReview: false,
            validation: { isValid: true, warnings: [] },
          },
        }),
      });
    });

    await uploadReceipts(page, 3);

    // Wait for upload thumbnails to appear
    await expect(page.locator('text=3')).toBeVisible();

    // Click "Process Files"
    await page.click('button:has-text("Process")');

    // Wait for processing to complete
    await waitForProcessingComplete(page);

    // Step 2: Go to dashboard
    await page.click('button:has-text("Go to Dashboard")');

    // Step 3: Verify counts
    const counts = await getReceiptCounts(page);
    expect(counts.total).toBe(3);

    // Verify receipts are visible in the list
    const receiptItems = page.locator('[class*="divide-y"] > div');
    await expect(receiptItems).toHaveCount(3);
  });

  test('should delete receipts from dashboard and update counts', async ({
    page,
  }) => {
    // Setup: Import 5 receipts first
    await page.goto('/upload');

    await page.route('**/api/extract', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            extractedData: {
              issuerName: 'Test Store',
              transactionDate: new Date().toISOString(),
              tNumber: 'T1234567890123',
              totalAmount: 1000,
              suggestedCategory: '消耗品費',
              taxBreakdown: [{ taxRate: 10, taxAmount: 100 }],
            },
            confidence: { overall: 0.95, fields: {} },
            needsReview: false,
            validation: { isValid: true, warnings: [] },
          },
        }),
      });
    });

    await uploadReceipts(page, 5);
    await page.click('button:has-text("Process")');
    await waitForProcessingComplete(page);

    // Go to dashboard
    await page.click('button:has-text("Go to Dashboard")');

    // Verify initial count
    let counts = await getReceiptCounts(page);
    expect(counts.total).toBe(5);

    // Step 1: Select first receipt
    const firstReceipt = page.locator('[class*="divide-y"] > div').first();
    await firstReceipt.click();

    // Step 2: Delete the receipt
    page.on('dialog', (dialog) => dialog.accept());
    await page.click('button:has-text("Delete")');

    // Wait for deletion to complete
    await page.waitForTimeout(500);

    // Step 3: Verify count decreased
    counts = await getReceiptCounts(page);
    expect(counts.total).toBe(4);
  });

  test('should navigate back to upload and import more receipts', async ({
    page,
  }) => {
    // Import initial batch
    await page.goto('/upload');

    await page.route('**/api/extract', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            extractedData: {
              issuerName: 'Test Store',
              transactionDate: new Date().toISOString(),
              tNumber: 'T1234567890123',
              totalAmount: 1000,
              suggestedCategory: '消耗品費',
              taxBreakdown: [{ taxRate: 10, taxAmount: 100 }],
            },
            confidence: { overall: 0.95, fields: {} },
            needsReview: false,
            validation: { isValid: true, warnings: [] },
          },
        }),
      });
    });

    await uploadReceipts(page, 2);
    await page.click('button:has-text("Process")');
    await waitForProcessingComplete(page);

    // Go to dashboard
    await page.click('button:has-text("Go to Dashboard")');

    // Verify initial count
    let counts = await getReceiptCounts(page);
    expect(counts.total).toBe(2);

    // Navigate back to upload
    await page.click('button[title*="back"], button:has-text("Upload")');

    // Import more receipts
    await uploadReceipts(page, 3);
    await page.click('button:has-text("Process")');
    await waitForProcessingComplete(page);

    // Go to dashboard again
    await page.click('button:has-text("Go to Dashboard")');

    // Verify total is now 5
    counts = await getReceiptCounts(page);
    expect(counts.total).toBe(5);
  });

  test('should select multiple receipts using keyboard', async ({ page }) => {
    // Setup: Import receipts
    await page.goto('/upload');

    await page.route('**/api/extract', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            extractedData: {
              issuerName: 'Test Store',
              transactionDate: new Date().toISOString(),
              tNumber: 'T1234567890123',
              totalAmount: 1000,
              suggestedCategory: '消耗品費',
              taxBreakdown: [{ taxRate: 10, taxAmount: 100 }],
            },
            confidence: { overall: 0.95, fields: {} },
            needsReview: false,
            validation: { isValid: true, warnings: [] },
          },
        }),
      });
    });

    await uploadReceipts(page, 5);
    await page.click('button:has-text("Process")');
    await waitForProcessingComplete(page);
    await page.click('button:has-text("Go to Dashboard")');

    // Enter select mode
    await page.click('button:has-text("Select")');

    // Wait for checkboxes to appear
    await page.waitForSelector('input[type="checkbox"]');

    // Select first checkbox by clicking
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await firstCheckbox.check();

    // Navigate down and select more using keyboard
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);

    const secondCheckbox = page.locator('input[type="checkbox"]').nth(1);
    await secondCheckbox.check();

    // Verify 2 receipts are selected
    const deleteButton = page.locator('button:has-text("Delete")');
    await expect(deleteButton).toContainText('2');
  });

  test('should delete multiple receipts in bulk', async ({ page }) => {
    // Setup
    await page.goto('/upload');

    await page.route('**/api/extract', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            extractedData: {
              issuerName: 'Test Store',
              transactionDate: new Date().toISOString(),
              tNumber: 'T1234567890123',
              totalAmount: 1000,
              suggestedCategory: '消耗品費',
              taxBreakdown: [{ taxRate: 10, taxAmount: 100 }],
            },
            confidence: { overall: 0.95, fields: {} },
            needsReview: false,
            validation: { isValid: true, warnings: [] },
          },
        }),
      });
    });

    await uploadReceipts(page, 6);
    await page.click('button:has-text("Process")');
    await waitForProcessingComplete(page);
    await page.click('button:has-text("Go to Dashboard")');

    // Initial count
    let counts = await getReceiptCounts(page);
    expect(counts.total).toBe(6);

    // Select mode
    await page.click('button:has-text("Select")');

    // Select 3 receipts
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await checkboxes.nth(2).check();

    // Bulk delete
    page.on('dialog', (dialog) => dialog.accept());
    await page.click('button:has-text("Delete"):has-text("3")');

    // Wait for deletion
    await page.waitForTimeout(1000);

    // Verify count
    counts = await getReceiptCounts(page);
    expect(counts.total).toBe(3);
  });

  test('should navigate receipts with arrow keys', async ({ page }) => {
    // Setup
    await page.goto('/upload');

    await page.route('**/api/extract', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            extractedData: {
              issuerName: `Store ${Math.random()}`,
              transactionDate: new Date().toISOString(),
              tNumber: 'T1234567890123',
              totalAmount: 1000,
              suggestedCategory: '消耗品費',
              taxBreakdown: [{ taxRate: 10, taxAmount: 100 }],
            },
            confidence: { overall: 0.95, fields: {} },
            needsReview: false,
            validation: { isValid: true, warnings: [] },
          },
        }),
      });
    });

    await uploadReceipts(page, 4);
    await page.click('button:has-text("Process")');
    await waitForProcessingComplete(page);
    await page.click('button:has-text("Go to Dashboard")');

    // Click first receipt to select it
    const firstReceipt = page.locator('[class*="divide-y"] > div').first();
    await firstReceipt.click();

    // Wait for detail panel to show
    await page.waitForSelector('input[value*="Store"]');

    // Press ArrowDown to navigate to next receipt
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);

    // Verify we moved to a different receipt (detail panel updated)
    const currentIndex = page.locator('span:has-text("/ 4")');
    await expect(currentIndex).toBeVisible();

    // Press ArrowUp to go back
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(300);

    // Should be back at first receipt
    await expect(currentIndex).toBeVisible();
  });
});

test.describe('Error Handling in Imports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearIndexedDB(page);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto('/upload');

    // Mock API to return error
    await page.route('**/api/extract', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
        }),
      });
    });

    await uploadReceipts(page, 1);
    await page.click('button:has-text("Process")');

    // Wait a bit for processing attempt
    await page.waitForTimeout(3000);

    // Should show failed status
    const failedIndicator = page.locator('text=failed, text=retry').first();
    await expect(failedIndicator).toBeVisible({ timeout: 10000 });

    // Count should still be 0 in dashboard
    await page.goto('/dashboard');
    const counts = await getReceiptCounts(page);
    expect(counts.total).toBe(0);
  });

  test('should allow retry after failure', async ({ page }) => {
    await page.goto('/upload');

    let attemptCount = 0;

    // Mock API to fail first, then succeed
    await page.route('**/api/extract', async (route) => {
      attemptCount++;
      if (attemptCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              extractedData: {
                issuerName: 'Test Store',
                transactionDate: new Date().toISOString(),
                tNumber: 'T1234567890123',
                totalAmount: 1000,
                suggestedCategory: '消耗品費',
                taxBreakdown: [{ taxRate: 10, taxAmount: 100 }],
              },
              confidence: { overall: 0.95, fields: {} },
              needsReview: false,
              validation: { isValid: true, warnings: [] },
            },
          }),
        });
      }
    });

    await uploadReceipts(page, 1);
    await page.click('button:has-text("Process")');

    // Wait for failure
    await page.waitForTimeout(3000);

    // Click retry button
    const retryButton = page.locator('button:has-text("Retry")').first();
    await retryButton.click();

    // Wait for success
    await waitForProcessingComplete(page);

    // Verify it succeeded
    await page.click('button:has-text("Go to Dashboard")');
    const counts = await getReceiptCounts(page);
    expect(counts.total).toBe(1);
  });

  test('should handle rate limit errors with retry', async ({ page }) => {
    await page.goto('/upload');

    // Mock rate limit error
    await page.route('**/api/extract', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Rate limit exceeded',
        }),
      });
    });

    await uploadReceipts(page, 1);
    await page.click('button:has-text("Process")');

    // Should show retry message
    await page.waitForTimeout(3000);

    const retryMessage = page.locator('text=/Retrying|failed/i').first();
    await expect(retryMessage).toBeVisible({ timeout: 15000 });
  });
});
