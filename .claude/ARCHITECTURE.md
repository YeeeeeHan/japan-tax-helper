# Architecture Documentation

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (Client)                    │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │              │  │              │  │              │  │
│  │   Next.js    │  │   IndexedDB  │  │   Canvas     │  │
│  │   React UI   │  │   (Dexie)    │  │   (Image     │  │
│  │              │  │              │  │   Compress)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │          │
│         └────────┬────────┴────────┬────────┘          │
│                  │                 │                    │
│                  ↓                 ↓                    │
│         ┌─────────────────────────────────┐            │
│         │   Upload → Process → Export     │            │
│         └─────────────┬───────────────────┘            │
└───────────────────────┼─────────────────────────────────┘
                        │ HTTP POST
                        ↓
┌─────────────────────────────────────────────────────────┐
│                  Next.js API Route (/api/extract)        │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  1. Receive image                              │    │
│  │  2. Validate size/type                         │    │
│  │  3. Convert to base64                          │    │
│  │  4. Call Gemini Vision API ───────────┐        │    │
│  │  5. Parse JSON response                │        │    │
│  │  6. Validate extracted data            │        │    │
│  │  7. Return to client                   │        │    │
│  └────────────────────────────────────────┼────────┘    │
└─────────────────────────────────────────┼──────────────┘
                                           │
                                           ↓
                        ┌──────────────────────────────┐
                        │   Google Gemini Vision API   │
                        │   (gemini-2.0-flash-exp)     │
                        └──────────────────────────────┘
```

## Technology Stack Decisions

### Frontend Framework: Next.js 14 (App Router)

**Why Next.js?**
- ✅ Server-side API routes for secure API key storage
- ✅ Excellent TypeScript support
- ✅ Built-in routing and optimization
- ✅ Easy deployment to Vercel/Netlify
- ✅ React Server Components for performance

**Trade-offs Considered:**
- ❌ Could use plain React + Express backend
  - Rejected: More complexity, separate deployments
- ❌ Could use SvelteKit or Remix
  - Rejected: Team familiarity with Next.js

### Database: Dexie.js (IndexedDB)

**Why IndexedDB + Dexie?**
- ✅ **Privacy**: All data stays in browser, never sent to backend
- ✅ **No hosting costs**: No database server needed
- ✅ **Offline-first**: Works without internet after initial load
- ✅ **Large storage**: Can store 100+ receipts with images
- ✅ **Dexie**: Type-safe queries, Promise-based API, migration support

**Trade-offs Considered:**
- ❌ Cloud database (Firebase, Supabase)
  - Rejected: Privacy concerns, hosting costs
  - Data leaves user's control
- ❌ LocalStorage
  - Rejected: 5-10MB limit too small for images
- ✅ **Chosen**: IndexedDB (typically 50% available disk, Safari: 500MB-1GB)

**Schema Design:**
```typescript
receipts: {
  id (PK),
  createdAt (indexed),
  transactionDate (indexed),
  category (indexed),
  processingStatus (indexed),
  needsReview (indexed),
  tNumber (indexed),
  ...
}

images: {
  id (PK),
  blob
}

batches: {
  id (PK),
  createdAt (indexed),
  status (indexed)
}
```

**Why separate images table?**
- Keeps receipts table lightweight for queries
- Blob storage separate from metadata
- Easier to implement lazy loading

### AI: Google Gemini Vision API

**Why Gemini over alternatives?**

| Feature | Gemini 2.0 Flash | GPT-4 Vision | Claude Vision |
|---------|-----------------|--------------|---------------|
| Cost | ~$0.002/image | ~$0.01/image | ~$0.024/image |
| Speed | 3-5 sec | 5-8 sec | 4-6 sec |
| Japanese OCR | Excellent | Very Good | Excellent |
| JSON mode | ✅ Yes | ✅ Yes | ❌ No |
| Structured output | ✅ Native | ✅ Native | Manual parsing |

**Decision**: Gemini 2.0 Flash
- Best cost/performance ratio
- Excellent Japanese text recognition
- Native JSON mode (reliable structured output)
- Fast response time

**Prompt Engineering Strategy:**
- Explicit JSON schema in prompt
- Request confidence scores per field
- Use Japanese field names for clarity
- Include examples in prompt for consistency

### Export: ExcelJS

**Why ExcelJS?**
- ✅ **MIT License** (SheetJS requires paid license for production)
- ✅ **Image embedding** support
- ✅ **Multi-sheet** workbooks
- ✅ **Styling** (colors, borders, fonts)
- ✅ **Japanese text** encoding (UTF-8)
- ✅ **Active maintenance**

**Trade-offs Considered:**
- ❌ SheetJS (xlsx)
  - Rejected: Commercial license required ($499/year)
- ❌ CSV only
  - Rejected: Can't embed images, single sheet only
- ✅ **Chosen**: ExcelJS

### UI Framework: Tailwind CSS + Lucide Icons

**Why Tailwind?**
- ✅ Utility-first: Rapid development
- ✅ No CSS file bloat with purging
- ✅ Consistent design system
- ✅ Excellent Japanese font support
- ✅ Dark mode ready (future)

**Why Lucide Icons?**
- ✅ Tree-shakeable (only icons used)
- ✅ Consistent design language
- ✅ React components (easy integration)

**Font Choice: Noto Sans JP**
- ✅ Google Fonts (free, reliable CDN)
- ✅ Excellent Japanese character support
- ✅ Multiple weights (400, 500, 600, 700)
- ✅ Good Latin character fallback

## Data Flow Architecture

### Upload Flow

```typescript
// 1. User drops files
onDrop(files: File[])
  ↓
// 2. Compress images (client-side)
compressImage(file) → Blob (200-500KB)
  ↓
// 3. Store in IndexedDB
storeImage(blob, imageId) → IndexedDB.images
  ↓
// 4. Send to API for extraction
POST /api/extract (FormData)
  ↓
// 5. Server calls Gemini
extractReceiptData(base64, mimeType, apiKey)
  ↓
// 6. Validate response
validateReceiptData(extractedData)
  ↓
// 7. Return to client
{ extractedData, confidence, needsReview }
  ↓
// 8. Store receipt record
addReceipt(receipt) → IndexedDB.receipts
```

### Dashboard Flow

```typescript
// 1. Load receipts on mount
useEffect(() => {
  getReceipts(filters) → Receipt[]
  getReceiptCounts() → { total, needsReview, ... }
})
  ↓
// 2. User selects receipt
setSelectedReceipt(receipt)
  ↓
// 3. Load image
getImageUrl(receipt.imageId) → blobUrl
  ↓
// 4. User edits fields
setEditedData(newData)
  ↓
// 5. Save changes
updateReceipt(id, { extractedData: editedData })
```

### Export Flow

```typescript
// 1. Get all receipts
const receipts = await getReceipts()
  ↓
// 2. Create Excel workbook
const workbook = new ExcelJS.Workbook()
  ↓
// 3. Add sheets
createMainSheet(receipts)      // 領収書一覧
createSummarySheet(receipts)   // 集計
createFlaggedSheet(receipts)   // 要確認
createImagesSheet(receipts)    // 領収書画像
  ↓
// 4. Generate buffer
const buffer = await workbook.xlsx.writeBuffer()
  ↓
// 5. Download
saveAs(blob, '領収書_2026-01-11.xlsx')
```

## State Management Strategy

### Why No Redux/Zustand for Most State?

**Decision**: Use React state + IndexedDB
- Most state is **persistent** (IndexedDB)
- Upload state is **transient** (component state)
- No complex shared state between routes

**When we DO use state management:**
- Upload page: Local state for file processing queue
- Dashboard: Local state for selected receipt, filters

**Benefits:**
- ✅ Simpler codebase
- ✅ No global state complexity
- ✅ Source of truth is IndexedDB
- ✅ Easier to debug

## Image Processing Strategy

### Compression Algorithm

```typescript
1. Load image → Canvas
2. Calculate aspect-ratio-preserving dimensions
   - Max dimension: 2048px
   - Maintain aspect ratio
3. Draw on canvas (resized)
4. Convert to JPEG blob
   - Quality: 0.85
   - Format: image/jpeg
5. Store compressed blob
```

**Results:**
- Original: 5-10MB → Compressed: 200-500KB
- 95% size reduction
- Still readable for OCR
- 100 receipts ≈ 20-50MB (manageable)

### Why Not Use Server-Side Compression?

- ❌ More API calls (upload original, compress, store)
- ❌ Server costs (bandwidth, processing)
- ❌ Slower (network latency)
- ✅ **Client-side**: Free, fast, works offline

## API Design Decisions

### Why Only One API Route?

**Route**: `POST /api/extract`

**Why not separate routes for different operations?**
- Most operations are client-side (IndexedDB)
- Only AI extraction needs server (API key security)
- Simpler API surface = easier maintenance

**Alternative considered:**
```
POST /api/receipts/upload
POST /api/receipts/extract
GET  /api/receipts/:id
PUT  /api/receipts/:id
DELETE /api/receipts/:id
```
**Rejected**: Unnecessary when using IndexedDB

## Security Architecture

### API Key Protection

```typescript
// ❌ NEVER do this (exposes key)
const gemini = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_KEY)

// ✅ ALWAYS do this (server-side only)
// In /api/extract/route.ts
const apiKey = process.env.GEMINI_API_KEY // No NEXT_PUBLIC prefix
```

**How it works:**
1. Client sends image to API route
2. Server has API key in environment
3. Server calls Gemini
4. Server returns structured data
5. API key never exposed to client

### Rate Limiting

**Implementation**: `src/lib/utils/rate-limit.ts`

Uses LRU cache for IP-based rate limiting:
```typescript
// 10 requests per minute per IP (configurable via RATE_LIMIT_MAX)
const limiter = rateLimit({
  interval: 60 * 1000,  // 1 minute window
  uniqueTokenPerInterval: 500  // Max 500 unique IPs tracked
});

// In API route
const ip = headers.get('x-forwarded-for') || 'anonymous';
await limiter.check(RATE_LIMIT, ip);  // Throws if exceeded
```

**Why LRU cache?**
- No external dependencies (Redis, etc.)
- Works in serverless (Vercel)
- Memory-efficient (auto-evicts old entries)
- Simple implementation

**Responses:**
- Normal: HTTP 200 with extracted data
- Rate limited: HTTP 429 `{ error: "Too many requests. Please try again later." }`

### Security Headers (Middleware)

**Implementation**: `src/middleware.ts`

Applied to all routes via Next.js middleware:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `1; mode=block` | XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable sensors |
| `Content-Security-Policy` | See below | Prevent injection |

**CSP Policy:**
```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data:;
connect-src 'self' https://generativelanguage.googleapis.com;
frame-ancestors 'none';
```

### Environment Variables

| Variable | Prefix | Access | Purpose |
|----------|--------|--------|---------|
| `GEMINI_API_KEY` | None | Server only | Gemini API authentication |
| `RATE_LIMIT_MAX` | None | Server only | Requests per minute per IP |
| `NEXT_PUBLIC_APP_URL` | `NEXT_PUBLIC_` | Client + Server | App URL (safe to expose) |

**Critical rule**: Never use `NEXT_PUBLIC_` prefix for sensitive data.

### Data Privacy

- ✅ **No backend database**: All data in user's browser
- ✅ **No tracking**: No analytics, no logging
- ✅ **No cloud storage**: Images never leave browser (except API call)
- ✅ **Deleteable**: Clear browser data = data gone

**Privacy guarantee**:
> "Your receipts never leave your device except for a temporary API call to extract data. All storage is local."

## Performance Optimizations

### 1. Virtual Scrolling (Future Enhancement)

**Current**: Render all receipts
**Issue**: Slow with 1000+ receipts
**Solution**: @tanstack/react-virtual
```typescript
const virtualizer = useVirtualizer({
  count: receipts.length,
  estimateSize: () => 80,
  overscan: 5
})
```

### 2. Image Lazy Loading

**Current**: Load images on demand
**How**: Intersection Observer
```typescript
useEffect(() => {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      loadImage(imageId)
    }
  })
})
```

### 3. Concurrent Processing Limit

**Why limit concurrency?**
- Gemini API rate limits
- Browser memory constraints
- Better error handling

**Current**: 5 concurrent requests
```typescript
const QUEUE_SETTINGS = {
  CONCURRENCY: 5,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
}
```

## Error Handling Strategy

### 1. Gemini API Errors

```typescript
try {
  const result = await extractReceiptData(...)
} catch (error) {
  if (error.status === 429) {
    // Rate limit → Retry with backoff
  } else if (error.status === 401) {
    // Invalid API key → Show user error
  } else {
    // Other error → Mark receipt as failed
  }
}
```

### 2. IndexedDB Errors

```typescript
try {
  await db.receipts.add(receipt)
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    // Storage full → Warn user
  } else {
    // Other error → Show error message
  }
}
```

### 3. Validation Errors

```typescript
const validation = validateReceiptData(extractedData)
if (!validation.isValid) {
  // Flag receipt for manual review
  receipt.needsReview = true
  receipt.notes = validation.errors.join(', ')
}
```

## Deployment Architecture

### Recommended: Vercel (Zero Config)

```bash
# Deploy to production
vercel --prod

# Environment variables (set in Vercel dashboard)
GEMINI_API_KEY=xxx
RATE_LIMIT_MAX=10
```

**Why Vercel?**
- ✅ Zero config Next.js deployment
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Serverless functions (API routes)
- ✅ Free tier (generous limits)
- ✅ Environment variables securely stored

**Alternatives:**
- Netlify (similar to Vercel)
- Cloudflare Pages (faster CDN)
- Self-hosted (Docker + Nginx)

### Vercel Configuration

**File**: `vercel.json`

```json
{
  "functions": {
    "src/app/api/extract/route.ts": {
      "maxDuration": 30  // 30 second timeout for AI processing
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store, max-age=0" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

### Security Checklist for Deployment

```
[ ] GEMINI_API_KEY set in Vercel Dashboard (not in code)
[ ] RATE_LIMIT_MAX set (optional, defaults to 10)
[ ] .env.local is gitignored (verify with `git status`)
[ ] No NEXT_PUBLIC_ prefix on sensitive variables
[ ] Build succeeds locally (`npm run build`)
[ ] Rate limiting tested (hit endpoint 11+ times)
[ ] Security headers present (check with `curl -I`)
```

### Optional: Google Cloud API Restrictions

For additional protection in Google Cloud Console:
1. APIs & Services > Credentials > Select API key
2. Application restrictions: "HTTP referrers"
   - Add: `https://your-domain.vercel.app/*`
3. API restrictions: Select only "Generative Language API"

This prevents key usage from unauthorized domains.

## Future Architecture Considerations

### 1. Cloud Sync (Optional Feature)

If users want data across devices:

```
IndexedDB (Browser 1)
    ↓ sync
Firebase/Supabase
    ↓ sync
IndexedDB (Browser 2)
```

**Implementation**:
- Make cloud sync **opt-in**
- Keep IndexedDB as primary
- Background sync when online
- Conflict resolution strategy

### 2. Multi-language Support

**Current**: Japanese only (hardcoded)
**Future**: i18n with next-intl

```typescript
// messages/ja.json
{
  "upload.title": "領収書一括アップロード"
}

// messages/en.json
{
  "upload.title": "Batch Upload Receipts"
}
```

### 3. Mobile App (PWA)

**Current**: Web app only
**Future**: Progressive Web App

```typescript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public'
})

module.exports = withPWA({
  // ...config
})
```

**Benefits**:
- Install to home screen
- Offline support
- Push notifications (reminders)

---

**Last Updated**: January 11, 2026
