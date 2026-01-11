# CLAUDE.md - AI Assistant Guide for Japan Tax Helper

> **For AI Assistants**: This guide helps you quickly understand and work with this codebase effectively.

## 🎯 Quick Context Loading

When starting a new session on this project, read these files **in this order**:

1. **This file** (CLAUDE.md) - Overview and patterns
2. `.claude/FEATURES.md` - Core features and how they work
3. `.claude/ARCHITECTURE.md` - Technical decisions and architecture
4. `.claude/RESEARCH.md` - Japanese tax law compliance requirements
5. `README.md` - User-facing documentation

## 📋 Project Overview

**What**: AI-powered receipt management system for Japanese self-employed professionals (個人事業主)
**Purpose**: Help users process tax receipts efficiently using AI OCR and auto-categorization
**Target Users**: Lawyers, consultants, freelancers in Japan who need to track business expenses

**Core Value Proposition**: One-click receipt processing with Japanese tax compliance

## 🏗️ Architecture at a Glance

```
User uploads receipts
    ↓
Gemini Vision API extracts data (server-side)
    ↓
IndexedDB stores locally (client-side)
    ↓
Dashboard for review/editing
    ↓
Excel export with 4 sheets
```

**Key Technologies**:
- Frontend: Next.js 14 (App Router), React 18, TypeScript
- AI: Google Gemini Vision API (gemini-2.0-flash-exp)
- Storage: Dexie.js (IndexedDB wrapper) - **client-side only**
- Export: ExcelJS
- UI: Tailwind CSS, Lucide Icons

## 🎨 Design Patterns Used

### 1. **Client-Side Storage Pattern**
- All data in IndexedDB (browser storage)
- No backend database
- Images compressed and stored as blobs
- Privacy-first approach

### 2. **API Route as Proxy Pattern**
```typescript
// Client uploads image
POST /api/extract
  → Server calls Gemini API (API key hidden)
  → Returns structured JSON
  → Client stores in IndexedDB
```

### 3. **Separation of Concerns**
- `lib/ai/` - AI integration only
- `lib/db/` - Database operations only
- `lib/export/` - Export logic only
- `lib/validation/` - Validation rules only

### 4. **Type-First Development**
- All types in `src/types/receipt.ts`
- Interfaces define data contracts
- TypeScript strict mode enabled

## 📁 Critical File Locations

### When working on AI extraction:
- `src/lib/ai/prompts.ts` - Gemini prompt engineering
- `src/lib/ai/gemini.ts` - API integration
- `src/app/api/extract/route.ts` - API endpoint

### When working on data storage:
- `src/lib/db/schema.ts` - Dexie database schema
- `src/lib/db/operations.ts` - CRUD operations
- `src/lib/storage/images.ts` - Image compression

### When working on UI:
- `src/app/upload/page.tsx` - Upload interface
- `src/app/dashboard/page.tsx` - Main dashboard
- `src/components/shared/` - Reusable components

### When working on validation:
- `src/lib/validation/receipt.ts` - All validation logic
- `src/lib/utils/constants.ts` - Categories, tax rates, thresholds

### When working on export:
- `src/lib/export/excel.ts` - ExcelJS implementation

### When working on security/deployment:
- `src/middleware.ts` - Security headers (CSP, X-Frame-Options, etc.)
- `src/lib/utils/rate-limit.ts` - IP-based rate limiting utility
- `src/app/api/extract/route.ts` - Rate limiting implementation
- `next.config.js` - Security headers for API routes
- `vercel.json` - Vercel deployment configuration

## 🔑 Key Concepts

### 適格請求書 (Qualified Invoice System)
Japanese tax law requires specific fields on receipts:
1. Issuer name + **T-Number** (T + 13 digits)
2. Transaction date
3. Description
4. Tax breakdown (8% or 10%)
5. Total amount

**Critical**: T-Number is required for tax deductions. App flags receipts without it.

### Confidence Scoring
AI returns confidence per field (0-1):
- **High**: ≥ 0.9 (green checkmark)
- **Medium**: 0.75-0.89 (needs review)
- **Low**: < 0.75 (auto-flagged)

**Weighted scoring**: T-Number and Total Amount have 2x weight (critical fields)

### Auto-Categorization
Categories match Japanese tax filing categories:
- 旅費交通費 (Travel & Transportation)
- 交際費 (Entertainment)
- 消耗品費 (Consumables)
- etc.

Keywords in `lib/ai/prompts.ts` help improve categorization accuracy.

## 🛠️ Common Development Tasks

### Adding a New Expense Category

1. Update type in `src/types/receipt.ts`:
```typescript
export type ExpenseCategory =
  | '旅費交通費'
  | '交際費'
  | 'YOUR_NEW_CATEGORY' // Add here
  | '未分類';
```

2. Add to constants in `src/lib/utils/constants.ts`:
```typescript
export const EXPENSE_CATEGORIES = [
  // ... existing
  {
    value: 'YOUR_NEW_CATEGORY',
    label: 'YOUR_NEW_CATEGORY',
    description: 'Description here'
  },
];
```

3. Update Gemini prompt in `src/lib/ai/prompts.ts`:
```typescript
// Add to category list in RECEIPT_EXTRACTION_PROMPT
// Add keywords to CATEGORY_KEYWORDS
```

### Updating Tax Rates

Tax rates are in `src/lib/utils/constants.ts`:
```typescript
export const TAX_RATES = {
  STANDARD: 10,
  REDUCED: 8,
} as const;
```

If tax rates change (unlikely), update here and in validation.

### Modifying Gemini Prompt

Edit `src/lib/ai/prompts.ts`:
- Keep JSON schema clear and specific
- Request confidence scores for all fields
- Use Japanese field names for clarity
- Test with sample receipts after changes

### Changing Confidence Thresholds

Edit `src/lib/utils/constants.ts`:
```typescript
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.9,           // Green checkmark
  MEDIUM: 0.75,        // Yellow warning
  LOW: 0.6,            // Red flag
  FLAG_FOR_REVIEW: 0.75,  // Auto-flag threshold
  CRITICAL_FIELD: 0.8,    // T-number, amount
};
```

Lower values = fewer flagged receipts (but more errors)
Higher values = more flagged receipts (but safer)

### Adjusting Rate Limits

Edit `.env.local` or Vercel environment variables:
```env
RATE_LIMIT_MAX=10  # Requests per minute per IP
```

Or modify `src/app/api/extract/route.ts`:
```typescript
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT_MAX || '10', 10);
```

### Deploying to Vercel

1. **Push code to GitHub**
2. **Import project** at vercel.com/new
3. **Set environment variables** in Vercel Dashboard:
   - `GEMINI_API_KEY` = your API key (required)
   - `RATE_LIMIT_MAX` = `10` (optional, defaults to 10)
4. **Deploy**

**Verification after deployment:**
```bash
# Check API key not in client bundle
# Open DevTools > Network > JS files > Search "AIza"

# Test rate limiting
for i in {1..15}; do curl -X POST https://your-domain.vercel.app/api/extract; done
# Should get 429 after 10 requests

# Verify security headers
curl -I https://your-domain.vercel.app
```

## ⚠️ Important Constraints & Gotchas

### 1. **IndexedDB Limitations**
- Browser storage quota typically 50% of available disk
- Safari has stricter limits (~500MB-1GB)
- Warn users at 80% capacity
- Images compressed to ~200-500KB each

### 2. **Gemini API Limits**
- Rate limits: Process max 5 receipts concurrently
- Image size: Max 4MB (compress before sending)
- Response time: ~3-5 seconds per receipt
- Cost: ~$0.002 per image (as of Jan 2026)

### 3. **Excel Export Constraints**
- Image embedding can be slow for 100+ receipts
- ExcelJS requires Buffer (use `as any` for type fix)
- Japanese text encoding: Use UTF-8, test on Windows Excel

### 4. **Browser Compatibility**
- IndexedDB: All modern browsers ✅
- Blob URLs: Must revoke to prevent memory leaks
- Canvas API: Used for image compression
- Service Workers: Optional for background processing

### 5. **Type Safety Challenges**
- Dexie returns Promises - always `await`
- Date objects from DB may need conversion
- Buffer type mismatch in ExcelJS (use `as any`)

## 🚨 Critical Rules

### Never Do This:
❌ Store API key in client-side code
❌ Use `NEXT_PUBLIC_` prefix for API keys (exposes to browser)
❌ Process 50+ receipts in parallel (rate limits)
❌ Skip image compression (storage bloat)
❌ Modify IndexedDB schema without migration
❌ Auto-approve receipts with confidence < 0.75
❌ Deploy without rate limiting enabled
❌ Commit `.env.local` to git (use `.env.local.example` for documentation)

### Always Do This:
✅ Validate T-Number format (regex: `/^T\d{13}$/`)
✅ Flag receipts with low confidence
✅ Compress images before storing
✅ Handle IndexedDB quota errors gracefully
✅ Test with real Japanese receipts
✅ Set environment variables in Vercel Dashboard (not in code)
✅ Keep rate limiting enabled (10 req/min/IP default)

## 🧪 Testing Approach

### Manual Testing Checklist:
1. Upload 20 sample receipts from `sample_receipts/`
2. Verify all 6 required fields extracted
3. Check confidence scores are reasonable
4. Edit a receipt and save
5. Filter by category, date, status
6. Export to Excel and verify all 4 sheets
7. Re-open Excel to verify Japanese text displays
8. Test on slow network (throttle to 3G)

### Sample Test Cases:
- Receipt with T-Number → Should extract and validate
- Receipt without T-Number → Should flag for review
- Faded/blurry receipt → Should have low confidence
- Receipt with both 8% and 10% tax → Both in breakdown
- Very large image (>10MB) → Should reject

## 📊 Data Flow Diagram

```
┌─────────────────┐
│  User uploads   │
│  receipt image  │
└────────┬────────┘
         │
         ↓
┌─────────────────────────┐
│  Store in IndexedDB     │
│  (compressed blob)      │
└────────┬────────────────┘
         │
         ↓
┌──────────────────────────┐
│  POST /api/extract       │
│  (FormData with image)   │
└────────┬─────────────────┘
         │
         ↓
┌────────────────────────────┐
│  Gemini Vision API         │
│  - Extract text (OCR)      │
│  - Structure as JSON       │
│  - Calculate confidence    │
└────────┬───────────────────┘
         │
         ↓
┌──────────────────────┐
│  Validation          │
│  - T-Number format   │
│  - Tax calculation   │
│  - Required fields   │
└────────┬─────────────┘
         │
         ↓
┌─────────────────────────┐
│  Store in IndexedDB     │
│  (receipt record)       │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────┐
│  Display in         │
│  Dashboard          │
└─────────────────────┘
```

## 🎓 Onboarding Steps for New AI Session

1. **Read this file first** ✅
2. **Check recent session log** → `.claude/SESSIONS.md`
3. **Review architecture** → `.claude/ARCHITECTURE.md`
4. **Understand features** → `.claude/FEATURES.md`
5. **Check tax compliance** → `.claude/RESEARCH.md`
6. **Ask user**: "What would you like to work on today?"

## 💡 Helpful Prompts for Common Tasks

### When asked to fix a bug:
"I'll investigate the issue. Let me:
1. Check the relevant file based on the error
2. Review related validation/logic
3. Test the fix with sample data
4. Update if needed"

### When asked to add a feature:
"Before implementing, let me clarify:
1. What specific behavior do you want?
2. Should this integrate with existing features?
3. Any Japanese tax compliance considerations?
4. Where in the UI should this appear?"

### When asked about performance:
"Let me check:
1. Are we processing too many receipts in parallel?
2. Are images being compressed properly?
3. Is IndexedDB query optimized?
4. Should we add pagination/virtual scrolling?"

## 📝 Documentation Maintenance

After each significant change:
1. Update `.claude/SESSIONS.md` with what was done
2. Update `.claude/ARCHITECTURE.md` if architecture changed
3. Update `.claude/FEATURES.md` if features added/modified
4. Update this file if new patterns introduced

## 🔗 External Resources

- [Next.js 14 Docs](https://nextjs.org/docs)
- [Gemini API Docs](https://ai.google.dev/docs)
- [Dexie.js Docs](https://dexie.org/)
- [ExcelJS Docs](https://github.com/exceljs/exceljs)
- [Japan NTA (Tax Authority)](https://www.nta.go.jp/)

---

**Last Updated**: January 11, 2026
**Current Version**: 0.1.0
**Status**: Production-ready MVP
