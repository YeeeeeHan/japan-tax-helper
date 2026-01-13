import { test, expect } from '@playwright/test';
import { clearIndexedDB, getReceiptCounts, uploadReceipts, waitForProcessingComplete } from './helpers';

test.describe('Receipt Count Consistency', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearIndexedDB(page);
  });

  test('counts should always match between upload and dashboard', async ({ page }) => {
    // Mock API
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

    // Round 1: Import 3 receipts
    await page.goto('/upload');
    await uploadReceipts(page, 3);
    await page.click('button:has-text("Process")');
    await waitForProcessingComplete(page);

    // Check dashboard
    await page.click('button:has-text("Go to Dashboard")');
    let counts = await getReceiptCounts(page);
    expect(counts.total).toBe(3);

    // Round 2: Import 2 more
    await page.goto('/upload');
    await uploadReceipts(page, 2);
    await page.click('button:has-text("Process")');
    await waitForProcessingComplete(page);

    await page.click('button:has-text("Go to Dashboard")');
    counts = await getReceiptCounts(page);
    expect(counts.total).toBe(5);

    // Round 3: Delete 1 receipt
    const firstReceipt = page.locator('[class*="divide-y"] > div').first();
    await firstReceipt.click();
    page.on('dialog', (dialog) => dialog.accept());
    await page.click('button:has-text("Delete")');
    await page.waitForTimeout(500);

    counts = await getReceiptCounts(page);
    expect(counts.total).toBe(4);

    // Round 4: Import 1 more
    await page.goto('/upload');
    await uploadReceipts(page, 1);
    await page.click('button:has-text("Process")');
    await waitForProcessingComplete(page);

    await page.click('button:has-text("Go to Dashboard")');
    counts = await getReceiptCounts(page);
    expect(counts.total).toBe(5);
  });

  test('bulk delete should correctly update counts', async ({ page }) => {
    // Mock API
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

    // Import 10 receipts
    await page.goto('/upload');
    await uploadReceipts(page, 10);
    await page.click('button:has-text("Process")');
    await waitForProcessingComplete(page);

    await page.click('button:has-text("Go to Dashboard")');
    let counts = await getReceiptCounts(page);
    expect(counts.total).toBe(10);

    // Select and delete 3
    await page.click('button:has-text("Select")');
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await checkboxes.nth(2).check();

    page.on('dialog', (dialog) => dialog.accept());
    await page.click('button:has-text("Delete"):has-text("3")');
    await page.waitForTimeout(1000);

    counts = await getReceiptCounts(page);
    expect(counts.total).toBe(7);

    // Select and delete 2 more
    await page.click('button:has-text("Select")');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    page.on('dialog', (dialog) => dialog.accept());
    await page.click('button:has-text("Delete"):has-text("2")');
    await page.waitForTimeout(1000);

    counts = await getReceiptCounts(page);
    expect(counts.total).toBe(5);
  });

  test('filter counts should match actual receipts', async ({ page }) => {
    // Mock API with some receipts needing review
    let callCount = 0;
    await page.route('**/api/extract', async (route) => {
      callCount++;
      const needsReview = callCount <= 2; // First 2 need review

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            extractedData: {
              issuerName: 'Test Store',
              transactionDate: new Date().toISOString(),
              tNumber: needsReview ? '' : 'T1234567890123', // Missing T-number triggers review
              totalAmount: 1000,
              suggestedCategory: '消耗品費',
              taxBreakdown: [{ taxRate: 10, taxAmount: 100 }],
            },
            confidence: {
              overall: needsReview ? 0.6 : 0.95,
              fields: {},
            },
            needsReview,
            validation: { isValid: true, warnings: [] },
          },
        }),
      });
    });

    // Import 5 receipts (2 will need review)
    await page.goto('/upload');
    await uploadReceipts(page, 5);
    await page.click('button:has-text("Process")');
    await waitForProcessingComplete(page);

    await page.click('button:has-text("Go to Dashboard")');

    // Check counts
    const counts = await getReceiptCounts(page);
    expect(counts.total).toBe(5);
    expect(counts.needsReview).toBe(2);

    // Filter by "Review" and verify count matches
    await page.click('button:has-text("Review")');
    await page.waitForTimeout(500);

    const reviewReceipts = page.locator('[class*="divide-y"] > div');
    await expect(reviewReceipts).toHaveCount(2);

    // Filter by "All" and verify
    await page.click('button:has-text("All")');
    await page.waitForTimeout(500);

    const allReceipts = page.locator('[class*="divide-y"] > div');
    await expect(allReceipts).toHaveCount(5);
  });

  test('deleting from filtered view should update all counts', async ({ page }) => {
    // Mock API
    let callCount = 0;
    await page.route('**/api/extract', async (route) => {
      callCount++;
      const needsReview = callCount <= 3;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            extractedData: {
              issuerName: 'Test Store',
              transactionDate: new Date().toISOString(),
              tNumber: needsReview ? '' : 'T1234567890123',
              totalAmount: 1000,
              suggestedCategory: '消耗品費',
              taxBreakdown: [{ taxRate: 10, taxAmount: 100 }],
            },
            confidence: {
              overall: needsReview ? 0.6 : 0.95,
              fields: {},
            },
            needsReview,
            validation: { isValid: true, warnings: [] },
          },
        }),
      });
    });

    // Import 6 receipts (3 need review, 3 done)
    await page.goto('/upload');
    await uploadReceipts(page, 6);
    await page.click('button:has-text("Process")');
    await waitForProcessingComplete(page);

    await page.click('button:has-text("Go to Dashboard")');

    let counts = await getReceiptCounts(page);
    expect(counts.total).toBe(6);
    expect(counts.needsReview).toBe(3);

    // Filter to show only "Review" receipts
    await page.click('button:has-text("Review")');
    await page.waitForTimeout(500);

    // Delete one from review list
    const firstReviewReceipt = page.locator('[class*="divide-y"] > div').first();
    await firstReviewReceipt.click();

    page.on('dialog', (dialog) => dialog.accept());
    await page.click('button:has-text("Delete")');
    await page.waitForTimeout(500);

    // Verify counts updated correctly
    counts = await getReceiptCounts(page);
    expect(counts.total).toBe(5);
    expect(counts.needsReview).toBe(2);
  });
});
