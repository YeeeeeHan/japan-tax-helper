# Monetisation Strategy for Japan Tax Helper

> **Last Updated**: January 12, 2026
> **Status**: Strategy Document - Pre-launch

## Executive Summary

**Recommended Model**: **"Process Free, Export Premium"** with Annual Tax Year Pass

- **Free Tier**: Unlimited OCR with cheaper model, Excel export with redacted columns
- **Paid Tier**: ¥1,500/year (~$10) for full Excel export (T-numbers + categories)
- **Positioning**: "See all your receipts processed free. Pay to unlock tax-ready export."

---

## Context & Constraints

### Business Context
| Factor | Value |
|--------|-------|
| API Cost (Gemini 2.0 Flash) | ~$0.01/receipt |
| API Cost (Gemini 1.5 Flash) | ~$0.003/receipt ← **USE THIS** |
| Target User | Heavy users: 500-2000 receipts/year |
| Usage Pattern | Tax season burst (Feb-March) |
| User Sophistication | Non-technical (lawyers, consultants) |
| Competition | Exists but overpriced, poor UX, limited free trial |
| Creator Goal | Many users, convert later |

### Key Technical Insight: Two-Model Strategy

**Instead of gating OCR processing, gate the valuable output.**

```
OLD APPROACH (Rejected):
├── Free: Process 30 receipts
├── Locked: Remaining receipts show "🔒 Pay to process"
└── Problem: Users don't see full value before paying

NEW APPROACH (Recommended):
├── Free: Process ALL receipts with Gemini 1.5 Flash ($0.003/each)
├── Free: Export Excel with REDACTED columns (T-number, category)
├── Paid: Full Excel export with all columns
└── Benefit: Users see ALL their data, THEN pay to unlock tax-critical fields
```

**Why this is better:**
1. Users process 500 receipts → see AI magic on ALL of them
2. Excel export works, but T-numbers show "🔒" and categories show "Upgrade to reveal"
3. User realizes: "I can see everything except what I need for taxes"
4. Payment unlocks full export → user files taxes successfully

**Cost comparison:**
| Scenario | Old ($0.01) | New ($0.003) | Savings |
|----------|-------------|--------------|---------|
| Free tier (100 receipts) | $1.00 | $0.30 | 70% |
| Heavy user (1000 receipts) | $10.00 | $3.00 | 70% |

---

## Options Analysis

### Option 1: Monthly Subscription ❌
| Pros | Cons |
|------|------|
| Recurring MRR | Doesn't match tax season burst |
| Predictable revenue | Users only need it 1-2 months/year |
| | Feels like waste for seasonal use |

**Verdict**: Poor fit. Tax prep is inherently annual, not monthly.

### Option 2: Lifetime License ❌
| Pros | Cons |
|------|------|
| Simple "pay once" | Heavy user = $10+/year API cost forever |
| No renewal friction | Unsustainable unit economics |
| | No recurring revenue |

**Verdict**: Works only if price is very high (¥10,000+), which defeats "no-brainer" goal.

### Option 3: Pay-Per-Receipt (Credits) ❌
| Pros | Cons |
|------|------|
| Perfect cost alignment | Non-technical users hate "credits" |
| Scales with usage | Cognitive load on user |
| | "How many credits do I need?" anxiety |

**Verdict**: Bad UX for target audience. Lawyers don't want to think about credits.

### Option 4: Annual Tax Year Pass ✅ (Recommended)
| Pros | Cons |
|------|------|
| Matches tax year cycle perfectly | Need to market renewal |
| Simple: "¥1,500 for 2025 taxes" | Users might delay until last minute |
| Covers API costs even for heavy users | |
| No "credits" confusion | |
| Competitive vs alternatives | |

**Verdict**: Best fit for usage pattern, user sophistication, and economics.

### Option 5: Freemium Only ⚠️
| Pros | Cons |
|------|------|
| Maximum adoption | No revenue |
| Word of mouth | API costs eat into budget |
| | Abuse potential |

**Verdict**: Good for adoption, but unsustainable alone. Combine with paid tier.

---

## Recommended Strategy: Process Free, Export Premium

### Tier Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                        FREE TIER                                 │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Upload unlimited receipts (stored locally)                   │
│  ✅ AI OCR for ALL receipts (Gemini 1.5 Flash)                   │
│  ✅ View extracted data: store name, date, amounts, tax breakdown│
│  ✅ Full editing and review of all processed receipts            │
│  ✅ Excel export with redacted columns                           │
│     └─ T-numbers: show "🔒 Upgrade"                              │
│     └─ Categories: show "🔒 Upgrade"                             │
│  ✅ No credit card required                                      │
│  ✅ No receipt limit                                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              TAX YEAR PASS - ¥1,500/year (~$10)                  │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Everything in Free                                           │
│  ✅ Full Excel export with ALL columns                           │
│     └─ T-numbers: revealed (required for tax filing!)            │
│     └─ Categories: revealed (auto-organized expenses)            │
│  ✅ Receipt statistics and insights                              │
│  ✅ Priority support during tax season                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              PREVIOUS YEAR ADD-ON - ¥1,000                       │
├─────────────────────────────────────────────────────────────────┤
│  For users who need to export last year's receipts               │
│  (e.g., exporting 2024 receipts in 2026)                         │
└─────────────────────────────────────────────────────────────────┘
```

### What Gets Redacted (and Why)

| Column | Free Tier | Paid Tier | Why Gate This? |
|--------|-----------|-----------|----------------|
| Store Name | ✅ Visible | ✅ Visible | Low value alone |
| Date | ✅ Visible | ✅ Visible | Useful but not critical |
| Amount | ✅ Visible | ✅ Visible | Useful but not critical |
| Tax Breakdown | ✅ Visible | ✅ Visible | Shows AI is working |
| **T-Number** | 🔒 Redacted | ✅ Revealed | **CRITICAL for tax filing** |
| **Category** | 🔒 Redacted | ✅ Revealed | **Saves hours of manual sorting** |

**Strategic insight**: Users CAN see their spending totals and verify OCR accuracy for free. But they CANNOT file taxes without T-numbers, and they'd waste hours categorizing manually without AI categories.

### Excel Preview UX

```
┌──────────────────────────────────────────────────────────────────────────┐
│ EXCEL PREVIEW (Free Tier)                                                │
├──────────┬────────────┬─────────┬────────────┬───────────────┬──────────┤
│ Store    │ Date       │ Amount  │ Tax 10%    │ T-Number      │ Category │
├──────────┼────────────┼─────────┼────────────┼───────────────┼──────────┤
│ ローソン  │ 2025/01/15 │ ¥1,080  │ ¥98        │ 🔒 Upgrade    │ 🔒 Upgrade│
│ スタバ    │ 2025/01/14 │ ¥550    │ ¥50        │ 🔒 Upgrade    │ 🔒 Upgrade│
│ タクシー  │ 2025/01/13 │ ¥2,340  │ ¥213       │ 🔒 Upgrade    │ 🔒 Upgrade│
└──────────┴────────────┴─────────┴────────────┴───────────────┴──────────┘
│                                                                          │
│  ⚠️ 2 columns hidden. Upgrade to Tax Year Pass (¥1,500) to reveal:       │
│     • T-Numbers (required for 適格請求書 tax compliance)                  │
│     • Categories (auto-sorted by AI for tax filing)                      │
│                                                                          │
│  [Download Redacted Excel]     [🔓 Upgrade & Download Full Excel]        │
└──────────────────────────────────────────────────────────────────────────┘
```

### Pricing Rationale (Updated)

```
With Gemini 1.5 Flash ($0.003/receipt):

Heavy user scenario:
- 1,000 receipts × $0.003 = $3.00 API cost
- Price at ¥1,500 (~$10) = $7 margin (70%)
- Even heaviest users are profitable!

Light user scenario:
- 100 receipts × $0.003 = $0.30 API cost
- Price at ¥1,500 = $9.70 margin (97%)

Free tier economics:
- Average free user: 200 receipts processed
- Cost: 200 × $0.003 = $0.60 per free user
- If 10% convert: CAC = $6.00 (acceptable)
- If 15% convert: CAC = $4.00 (great)
```

### Why This Model is Superior

| Dimension | Old "Gate OCR" Model | New "Gate Export" Model |
|-----------|---------------------|------------------------|
| User sees value | Partial (30 receipts) | Complete (all receipts) |
| Conversion psychology | "Pay to see if it works" | "Pay to use what you've seen working" |
| Abuse risk | High (create accounts) | Low (data is in their browser anyway) |
| API cost control | Hard caps create friction | Natural: users only process what they need |
| Excel preview | N/A | Shows exactly what they're missing |

### Competitive Positioning

| Competitor | Price | Our Advantage |
|------------|-------|---------------|
| Freee | ¥1,980/month | 10x cheaper per year |
| MoneyForward | ¥800/month | 6x cheaper per year |
| Manual Excel | Free | 10+ hours saved |

**Messaging**: "Process a year of receipts for less than the cost of one bento."

---

## User Journey & Conversion Points

### Journey Map (Updated for "Process Free, Export Premium")

```
1. DISCOVERY
   User searches "領収書 OCR" or "確定申告 レシート"
   └→ Lands on landing page
   └→ Sees: "Process unlimited receipts FREE. Pay only for tax-ready export."

2. FIRST VALUE (No signup required)
   └→ Uploads 5-10 receipts
   └→ Sees AI extract ALL fields perfectly
   └→ "Wow, this actually works on Japanese receipts!"

3. BULK PROCESSING (Still free!)
   └→ Uploads remaining 200-500 receipts
   └→ All processed with Gemini 1.5 Flash
   └→ Dashboard shows all data: stores, dates, amounts, tax breakdown
   └→ User thinks: "This is amazing, I can see everything"

4. EXPORT ATTEMPT ← Key conversion moment
   └→ User clicks "Export to Excel"
   └→ Preview shows: T-numbers and Categories are "🔒 Upgrade"
   └→ User realizes: "I need T-numbers to file taxes!"
   └→ User sees: "Unlock full export for ¥1,500"

5. CONVERSION
   └→ User weighs: ¥1,500 vs hours of manual work
   └→ Stripe Checkout opens
   └→ Instant unlock → full Excel downloads

6. SUCCESS & RETENTION
   └→ Files taxes with complete data
   └→ Next year: "Your 2026 Tax Year Pass - ¥1,500"
   └→ Already trusts the app, converts again
```

### Conversion Triggers

| Trigger | When | Message |
|---------|------|---------|
| Export preview | First export attempt | "Preview: 2 columns redacted. Upgrade to reveal." |
| In-app redaction | Viewing T-number column | "🔒 T-numbers hidden. Required for 適格請求書." |
| Category column | Viewing category column | "🔒 AI categories hidden. Save hours of sorting." |
| Tax deadline | February | "Tax deadline March 15! Export your receipts now." |
| Summary stats | Dashboard | "Total: ¥1,234,567. Upgrade to see by category." |

---

## Abuse Prevention

### Threat Model (Updated)

| Attack | Likelihood | Impact | Mitigation |
|--------|------------|--------|------------|
| Unlimited free OCR | HIGH | $0.003/receipt adds up | Rate limit + soft caps |
| Inspect IndexedDB for hidden data | MEDIUM | Tech users bypass redaction | **Data is redacted server-side** |
| Multiple accounts | LOW | No benefit - data stays local | N/A (not an issue) |
| Bot abuse | LOW | API costs | Rate limiting (already done) |

### Critical Implementation Detail

**DO NOT store T-numbers/categories in IndexedDB for free users.**

```
WRONG (bypassable):
├── IndexedDB stores: { tNumber: "T1234567890123", category: "旅費交通費" }
├── UI just hides these columns
└── User inspects storage → gets free data

RIGHT (secure):
├── Free tier: Gemini returns { tNumber: null, category: null }
├── IndexedDB stores: { tNumber: null, category: null }
├── Paid tier: Re-process OR server stores full data
└── User cannot bypass - data never existed locally
```

**Two implementation options:**

1. **Server-side storage for paid data** (Recommended)
   - Free: Process with Gemini, return redacted response
   - Paid: Server stores full extraction, user downloads complete Excel
   - Pro: Truly secure
   - Con: Needs backend database

2. **Re-process on payment**
   - Free: Process with Gemini, redact T-number/category before returning
   - Paid: Re-process receipts, return full data
   - Pro: No backend database needed
   - Con: Double API cost for converters (~$0.003 × receipts × 2)

### Recommended Mitigations

**Tier 1 (Implement now)**:
- Rate limiting: 10 requests/minute/IP (already done)
- Server-side redaction (never send full data to free users)
- Soft cap warning at 500 receipts: "High volume? Contact us for enterprise."

**Tier 2 (If abuse detected)**:
- Email required after 100 receipts
- Daily processing cap (e.g., 50 receipts/day)
- Captcha on bulk uploads

### Acceptable Abuse Level

Given:
- Free user processing 500 receipts = $1.50 cost
- Side project with flexible economics
- Goal is user adoption
- **Key insight**: Unlike "gate OCR" model, there's no easy way to abuse this. Users can't create multiple accounts to get more free exports - the gate is on export, not processing.

**Policy**: Accept up to 30% of users never converting. If they process receipts and never export, they're not costing much AND they might recommend the app to others.

---

## Implementation Plan

### Phase 1: Model Switch (Backend)
- [x] Core OCR functionality (Gemini 2.0 Flash)
- [ ] **Switch to Gemini 1.5 Flash** (cost reduction)
- [ ] **Server-side redaction**: Strip T-number/category from response
- [ ] API endpoint returns `{ isPaid: false }` flag with redacted data

### Phase 2: Free Tier UX
- [x] Local storage with IndexedDB
- [x] Excel export (basic)
- [ ] **Dashboard shows redacted columns** with 🔒 icons
- [ ] **Excel export with redaction** (T-number, category columns show "Upgrade")
- [ ] **In-app Excel preview** before download
- [ ] Upgrade CTA on redacted columns

### Phase 3: Payment Integration
- [ ] Stripe integration
- [ ] Tax Year Pass product setup (¥1,500)
- [ ] Payment success → **re-process receipts with full data** OR **unlock server-stored data**
- [ ] Full Excel download after payment
- [ ] Receipt/invoice generation

### Phase 4: Conversion Optimization
- [ ] Export preview modal with upgrade CTA
- [ ] "T-numbers required for 適格請求書" messaging
- [ ] Tax deadline reminders (Feb-March)
- [ ] Dashboard category breakdown (redacted for free users)

### Phase 5: Retention & Scale
- [ ] Annual renewal reminders
- [ ] "Previous Year Pass" upsell
- [ ] Enterprise tier for accountants
- [ ] Usage analytics dashboard

---

## Metrics to Track

### Funnel Metrics (Updated)
| Metric | Target | Notes |
|--------|--------|-------|
| Visitors → Upload | 30% | Landing page effectiveness |
| Upload → 50+ receipts | 60% | Higher than before (no limit!) |
| 50+ receipts → Export attempt | 80% | Users want their data |
| Export attempt → Paid | 20% | Key conversion moment |

### Unit Economics (With Gemini 1.5 Flash)
| Metric | Target |
|--------|--------|
| API cost per receipt | $0.003 |
| Average receipts per free user | 200 |
| Cost per free user | $0.60 |
| Conversion rate | > 15% |
| CAC (at 15% conversion) | $4.00 |
| ARPU | ¥1,500 (~$10) |
| Gross margin per paid user | ~70% |

### Health Metrics
| Metric | Alert Threshold |
|--------|-----------------|
| Average receipts per free user | > 500 (cost concern) |
| Free tier API cost/month | > $200 |
| Conversion rate | < 10% (pricing/UX issue) |
| Churn rate | > 50% YoY |

---

## Alternative Models Considered

### Per-Receipt Pricing (Rejected)
```
¥10 per receipt (~$0.07)
- 100 receipts = ¥1,000
- 500 receipts = ¥5,000
```
**Why rejected**: Non-technical users hate calculating. "How many receipts do I have?" creates friction.

### Monthly During Tax Season (Rejected)
```
¥500/month, cancel anytime
```
**Why rejected**: Users will subscribe for 1 month, process everything, cancel. Annual pass is simpler.

### Freemium with Ads (Rejected)
```
Free unlimited, show ads
```
**Why rejected**: Ads degrade UX, professionals hate ads, CPM too low in Japan for B2B.

### Enterprise Tier (Future Consideration)
```
¥10,000/year for accountants
- Process client receipts
- Multi-user access
- API access
```
**Why deferred**: Focus on individual users first. Enterprise adds complexity.

---

## Open Questions

1. **Email verification friction**: Will requiring email for free tier hurt conversion?
   - Test: Email optional vs required A/B test

2. **Optimal free limit**: Is 30 the right number?
   - Test: 20 vs 30 vs 50 receipts

3. **Price sensitivity**: Is ¥1,500 the sweet spot?
   - Test: ¥980 vs ¥1,500 vs ¥1,980

4. **Timing of upgrade prompt**: When is user most likely to convert?
   - Hypothesis: Right after seeing first 5 receipts processed perfectly

---

## Appendix: Competitor Analysis

### Freee (freee.co.jp)
- **Price**: ¥1,980-3,980/month
- **Pros**: Full accounting suite, established brand
- **Cons**: Expensive, complex, overkill for receipt processing
- **Our angle**: "Just receipts, done right"

### MoneyForward (moneyforward.com)
- **Price**: ¥800-1,280/month
- **Pros**: Good UI, popular
- **Cons**: Monthly fee, requires subscription commitment
- **Our angle**: "One-time annual payment, no commitment"

### Manual Process (Excel + Paper)
- **Price**: Free
- **Pros**: No learning curve
- **Cons**: Hours of manual entry, error-prone
- **Our angle**: "10 hours → 10 minutes"

---

## Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Model** | Process Free, Export Premium | Users see full value before paying |
| **AI Model** | Gemini 1.5 Flash ($0.003) | 70% cost reduction vs 2.0 |
| **Free Tier** | Unlimited OCR, redacted export | Maximum adoption, conversion at export |
| **Redacted Columns** | T-numbers + Categories | Critical for tax filing, high-value |
| **Price** | ¥1,500/year | Sweet spot: 70% margin even on heavy users |
| **Abuse Prevention** | Server-side redaction + rate limit | Can't bypass - data never sent |
| **Primary CTA** | "Unlock full export for ¥1,500" | Clear value prop at decision point |

**One-liner pitch**: "Process unlimited receipts free. Pay ¥1,500 to export tax-ready data."

**Alternative pitch**: "See all your receipts. Pay only when you're ready to file."

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-12 | Switch from "Gate OCR" to "Gate Export" | Users see full value before payment |
| 2026-01-12 | Use Gemini 1.5 Flash | 70% cost reduction enables generous free tier |
| 2026-01-12 | Redact T-numbers + Categories | These are tax-critical, worth paying for |
| 2026-01-12 | Server-side redaction | Prevents tech users from bypassing |
