# Playwright E2E Tests

This directory contains end-to-end tests for the Japan Tax Helper application using Playwright.

## Test Files

### `user-flows.spec.ts`
Tests comprehensive user workflows:
- Importing receipts and verifying dashboard counts
- Deleting receipts from dashboard and count updates
- Navigating between upload and dashboard pages
- Selecting multiple receipts with keyboard
- Bulk deletion operations
- Keyboard navigation through receipts (arrow keys)
- Error handling for API failures
- Retry functionality after failures
- Rate limit error handling

### `receipt-count-consistency.spec.ts`
Tests to ensure receipt counts are always consistent:
- Counts match between upload and dashboard
- Bulk delete updates counts correctly
- Filter counts match actual receipts
- Deleting from filtered views updates all counts

### `helpers.ts`
Utility functions for tests:
- `createMockReceiptFile()` - Create mock receipt images
- `uploadReceipts()` - Upload receipts to the upload page
- `getReceiptCounts()` - Get current receipt counts from dashboard
- `waitForProcessingComplete()` - Wait for upload processing to finish
- `clearIndexedDB()` - Reset IndexedDB between tests
- `navigateReceiptsWithKeyboard()` - Navigate using arrow keys
- `selectReceiptsWithKeyboard()` - Select receipts using keyboard

## Running Tests

### Prerequisites
1. Install dependencies: `npm install`
2. Install Playwright browsers: `npx playwright install`

### Commands
```bash
# Run all tests (headless)
npm test

# Run tests with UI mode (recommended for development)
npm run test:ui

# Run tests in headed mode (see the browser)
npm run test:headed

# Run tests in debug mode
npm run test:debug

# Run specific test file
npx playwright test user-flows.spec.ts

# Run tests matching a pattern
npx playwright test --grep "delete"
```

## Test Strategy

### Mocking
- API calls to `/api/extract` are mocked to avoid hitting the real Gemini API
- Mock responses return valid receipt data
- Error scenarios are simulated by returning error status codes

### State Management
- IndexedDB is cleared before each test to ensure clean state
- Tests are isolated and can run in any order

### Assertions
- Receipt counts are verified at each step
- UI elements are checked for visibility
- State changes are validated after operations

## Known Considerations

1. **IndexedDB**: Tests rely on IndexedDB for storage. Browser must support it.
2. **Timing**: Some operations have small delays to allow for state updates
3. **File Uploads**: Tests use small mock image files to simulate real uploads
4. **API Mocking**: All Gemini API calls are intercepted and mocked

## Debugging Tips

1. Use `npm run test:ui` to see tests running in real-time
2. Add `await page.pause()` to stop test execution and inspect
3. Check screenshots in `test-results/` folder after failed tests
4. Use `--debug` flag to step through tests line by line
5. Add `{ headless: false, slowMo: 1000 }` to playwright.config.ts for slower execution

## Coverage

These tests cover:
- ✅ Full import workflow (upload → process → dashboard)
- ✅ Single and bulk deletion
- ✅ Keyboard navigation (arrow keys)
- ✅ Multi-select with keyboard
- ✅ Receipt count consistency across all operations
- ✅ Error handling and retry logic
- ✅ Filter functionality (All, Review, Done)
- ✅ State persistence in IndexedDB

## Future Enhancements

- [ ] Test export functionality
- [ ] Test edit/review workflow
- [ ] Test search/filtering
- [ ] Test mobile responsive layouts
- [ ] Performance tests with large numbers of receipts
- [ ] Accessibility tests
