# Core Features Documentation

## Feature Overview

### 1. Batch Receipt Upload
### 2. AI-Powered Data Extraction
### 3. Interactive Dashboard
### 4. Excel Export
### 5. Japanese Tax Compliance Validation

---

## Feature 1: Batch Receipt Upload

**Location**: `/upload` page
**Files**:
- `src/app/upload/page.tsx`
- `src/lib/storage/images.ts`

### How It Works

```typescript
1. User drags/drops or selects files
   ↓
2. Files validated (type, size)
   ↓
3. Images compressed (2048px max, 85% quality)
   ↓
4. Stored in IndexedDB as blobs
   ↓
5. Sent to /api/extract for processing
   ↓
6. Results stored in IndexedDB
```

### Key Features
- ✅ Drag-and-drop interface (react-dropzone)
- ✅ Multiple file upload
- ✅ Progress tracking per file
- ✅ Status cards (uploaded/processing/completed)
- ✅ File type validation (JPG, PNG, HEIC, PDF)
- ✅ Size limit (10MB per file)
- ✅ **Retry on click** - Failed receipts show retry button overlay

### User Flow
1. User sees 3 status cards (アップロード済み, 処理中, 完了)
2. Drag receipts onto drop zone
3. Files show in list with progress bars
4. Click "一括登録する" to start processing
5. Watch progress in real-time
6. Navigate to dashboard when complete

### Technical Details

**Image Compression:**
```typescript
compressImage(file: File) {
  // Load image to canvas
  // Resize to max 2048px (maintain aspect ratio)
  // Convert to JPEG at 85% quality
  // Return blob (~200-500KB)
}
```

**Storage:**
- Images: IndexedDB `images` table
- Metadata: IndexedDB `receipts` table
- Separation allows efficient queries

**Concurrency:**
- Process 5 receipts at a time
- Prevents rate limits
- Better error recovery

---

## Feature 2: AI-Powered Data Extraction

**Location**: `/api/extract` route
**Files**:
- `src/app/api/extract/route.ts`
- `src/lib/ai/gemini.ts`
- `src/lib/ai/prompts.ts`

### How It Works

```typescript
1. API receives image from client
   ↓
2. Convert to base64
   ↓
3. Send to Gemini Vision API with structured prompt
   ↓
4. Gemini returns JSON with extracted data
   ↓
5. Parse and validate response
   ↓
6. Calculate confidence scores
   ↓
7. Flag for review if low confidence
   ↓
8. Return to client
```

### Extracted Fields

| Field | Japanese | Required | Confidence Weight |
|-------|----------|----------|-------------------|
| Issuer Name | 発行事業者名 | ✅ Yes | 1.0x |
| T-Number | 登録番号 | ⚠️ Recommended | 2.0x (critical) |
| Transaction Date | 取引年月日 | ✅ Yes | 1.5x |
| Description | 取引内容 | ✅ Yes | 1.0x |
| Subtotal (ex tax) | 税抜金額 | ✅ Yes | 1.5x |
| Tax Breakdown | 消費税 | ✅ Yes | 1.5x |
| Total Amount | 合計金額 | ✅ Yes | 2.0x (critical) |
| Category | 勘定科目 | ✅ Yes | 0.5x (user can change) |

### Auto-Categorization Logic

**Keyword Matching:**
```typescript
If merchant contains "タクシー" or "JR"
  → 旅費交通費

If merchant contains "レストラン" or "居酒屋"
  → 交際費

If merchant contains "文具" or "Amazon"
  → 消耗品費

// etc... (see CATEGORY_KEYWORDS in prompts.ts)
```

**Confidence Scoring:**
```typescript
overallConfidence = (
  issuerName * 1.0 +
  tNumber * 2.0 +
  transactionDate * 1.5 +
  totalAmount * 2.0 +
  taxBreakdown * 1.5 +
  category * 0.5
) / totalWeight
```

### Validation Rules

1. **T-Number Format**: `/^T\d{13}$/`
2. **Tax Calculation**: Sum of tax amounts ≈ total - subtotal (±1円)
3. **Tax Rates**: Only 8% or 10% allowed
4. **Required Fields**: All fields must have values
5. **Date Range**: Reasonable date (not in future)

### Error Handling

**Gemini API Errors:**
- 429 Rate Limit → Retry with exponential backoff
- 401 Unauthorized → Show API key error
- 500 Server Error → Retry up to 3 times
- Other → Mark receipt as failed

**Low Confidence:**
- Overall < 0.75 → Flag for review
- T-Number < 0.8 → Flag for review
- Total Amount < 0.8 → Flag for review

---

## Feature 3: Interactive Dashboard

**Location**: `/dashboard` page
**Files**:
- `src/app/dashboard/page.tsx`
- `src/lib/db/operations.ts`

### How It Works

```typescript
1. Load receipts from IndexedDB (with filters)
   ↓
2. Display list on left side
   ↓
3. User clicks receipt
   ↓
4. Load image and show in detail panel
   ↓
5. User edits fields
   ↓
6. Save updates to IndexedDB
   ↓
7. Mark as reviewed
```

### Layout

```
┌──────────────────────────────────────────────┐
│ Header: Search | Filters | Export | Avatar   │
├──────────────────────────────────────────────┤
│  Workflow Progress: [Upload]→[Review]→[Export]│
├───────────┬──────────────────────────────────┤
│           │                                  │
│  Receipt  │        Detail Panel              │
│  List     │                                  │
│           │   ┌────────────────────┐         │
│  • Item 1 │   │  Receipt Image     │         │
│  • Item 2 │   │                    │         │
│  • Item 3 │   └────────────────────┘         │
│  • Item 4 │                                  │
│           │   Editable Form Fields           │
│           │   [Issuer Name]                  │
│           │   [Date]                         │
│           │   [T-Number] [Verify]            │
│           │   [Amount]                       │
│           │   [Category ▼]                   │
│           │                                  │
│           │   [Cancel] [Save & Approve]      │
└───────────┴──────────────────────────────────┘
```

### Key Features

**Workflow Progress Bar:**
- 3-step visual progress: Upload → Review → Export
- Step 1 (Upload): Green checkmark when receipts exist
- Step 2 (Review): Active with count badge showing unreviewed receipts
- Step 3 (Export): Green when all receipts are reviewed, ready to export
- Provides clear guidance on what to do next

**Export Blocking:**
- Export button disabled (grayed out) until all receipts reviewed
- Clicking disabled export shows modal explaining why
- "Review Now" button in modal filters to unreviewed receipts
- Prevents exporting incomplete/unverified data

**Contextual Empty States:**
- "Needs Review" filter empty: Shows success message "All reviewed - Ready to export"
- "Done" filter empty: Shows hint to start reviewing with button
- No receipts: Shows upload prompt

**Filtering:**
- すべて (All) - Show all receipts
- 要確認 (Needs Review) - Only flagged receipts
- 完了 (Done) - Only reviewed receipts

**Search:**
- Search by issuer name
- Search by description
- Real-time filtering

**Status Indicators:**
- 🔴 Red dot = Needs review
- 🟢 Green dot = Reviewed & approved
- 🟡 Yellow dot = Processing

**Confidence Indicators:**
- ✅ Green checkmark = High confidence (≥0.9)
- ⚠️ Yellow warning = Medium confidence (0.75-0.89)
- ❌ Red flag = Low confidence (<0.75)

### Edit Mode

**Inline Editing:**
- All fields editable
- Auto-save on blur (optional)
- Manual save with button

**Field Validation:**
- T-Number: Format check on blur
- Amount: Positive number only
- Date: Valid date format
- Category: Dropdown selection

**Save Behavior:**
```typescript
handleSave() {
  updateReceipt(id, {
    extractedData: editedData,
    isManuallyReviewed: true,
    needsReview: false,
    updatedAt: new Date()
  })
}
```

---

## Feature 4: Excel Export

**Location**: Export button in dashboard
**Files**:
- `src/lib/export/excel.ts`

### How It Works

```typescript
1. Get all receipts from IndexedDB
   ↓
2. Create ExcelJS workbook
   ↓
3. Generate 4 sheets:
   - Main data
   - Summary by category
   - Flagged receipts
   - Images
   ↓
4. Download as .xlsx file
```

### Sheet Structure

**Sheet 1: 領収書一覧 (Main Data)**

| 日付 | 発行者 | T番号 | 内容 | 税抜金額 | 消費税(8%) | 消費税(10%) | 合計金額 | 分類 | 備考 |
|------|--------|-------|------|----------|------------|-------------|----------|------|------|
| 2023/10/24 | Amazon | T123... | 事務用品 | ¥11,273 | - | ¥1,127 | ¥12,400 | 消耗品費 | - |

**Sheet 2: 集計 (Summary)**

| 分類 | 件数 | 合計金額 |
|------|------|----------|
| 旅費交通費 | 15 | ¥45,230 |
| 交際費 | 8 | ¥32,100 |
| **合計** | **143** | **¥523,450** |

**Sheet 3: 要確認 (Flagged)**

| 日付 | 発行者 | T番号 | 金額 | 信頼度 | 問題点 |
|------|--------|-------|------|--------|--------|
| 2023/10/21 | Seven Eleven | - | ¥850 | 72% | T番号なし |

**Sheet 4: 領収書画像 (Images)**

| Image | 日付 | 発行者 | 金額 |
|-------|------|--------|------|
| [Embedded JPEG] | 2023/10/24 | Amazon | ¥12,400 |

### Technical Details

**Image Embedding:**
```typescript
// Get blob from IndexedDB
const blob = await getImageBlob(imageId)

// Convert to buffer
const buffer = Buffer.from(await blob.arrayBuffer())

// Add to workbook
const imageId = workbook.addImage({
  buffer: buffer,
  extension: 'jpeg'
})

// Place in cell
sheet.addImage(imageId, {
  tl: { col: 0, row: rowIndex },
  ext: { width: 300, height: 300 }
})
```

**Formatting:**
- Currency: `¥#,##0` format
- Dates: `yyyy/mm/dd` format
- Headers: Bold, colored background
- Borders: All cells
- Column widths: Auto-sized

---

## Feature 5: Japanese Tax Compliance Validation

**Location**: Throughout app
**Files**:
- `src/lib/validation/receipt.ts`

### Compliance Rules

**適格請求書 (Qualified Invoice) Requirements:**

1. ✅ Issuer name must be present
2. ✅ T-Number format: `T` + 13 digits
3. ✅ Transaction date required
4. ✅ Description of goods/services
5. ✅ Tax rate specified (8% or 10%)
6. ✅ Tax amount by rate
7. ✅ Total amount matches calculation

### Validation Functions

```typescript
// T-Number format
validateTNumber(tNumber: string): boolean {
  return /^T\d{13}$/.test(tNumber)
}

// Tax calculation
validateTaxCalculation(data: ExtractedData): boolean {
  const calculatedTax = sum(taxBreakdown.taxAmount)
  const expectedTax = totalAmount - subtotal
  return Math.abs(calculatedTax - expectedTax) <= 1 // ±1円
}

// Tax rates
validateTaxRates(data: ExtractedData): boolean {
  return taxBreakdown.every(tb =>
    tb.taxRate === 8 || tb.taxRate === 10
  )
}
```

### Warning System

**Auto-Generated Warnings:**
- Missing T-Number → "T番号なし"
- Low confidence → "信頼度低い (XX%)"
- Invalid tax calc → "Tax calculation mismatch"
- Invalid T-Number format → "Invalid T-Number format"

**Display:**
- Red badge in dashboard
- Warning icon in receipt list
- Tooltip with details
- Separate sheet in Excel export

---

## Performance Characteristics

| Feature | Metric | Target |
|---------|--------|--------|
| Upload | Time per receipt | <5 seconds |
| Compression | Size reduction | 90-95% |
| Dashboard | Load time (100 receipts) | <500ms |
| Search | Response time | <100ms |
| Export | Time (100 receipts) | <10 seconds |
| Export | Time (100 receipts + images) | <30 seconds |

---

## Future Enhancements

### Planned Features

1. **Duplicate Detection**
   - Hash-based image comparison
   - Warn before uploading duplicate

2. **Batch T-Number Verification**
   - Call NTA API to verify T-Numbers
   - Flag invalid registrations

3. **Receipt Templates**
   - Save common merchants
   - Auto-fill known data

4. **Multi-Currency Support**
   - Handle USD, EUR receipts
   - Auto-convert to JPY

5. **Receipt Splitting**
   - Split one receipt into multiple expense categories
   - Handle complex receipts

6. **Cloud Sync** (Optional)
   - Firebase/Supabase sync
   - Multi-device access
   - Conflict resolution

---

**Last Updated**: January 11, 2026
