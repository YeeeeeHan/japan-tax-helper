# Monetisation Strategy for Japan Tax Helper

> **Last Updated**: January 11, 2026
> **Status**: Strategy Document - Pre-launch

## Executive Summary

**Recommended Model**: **Annual Tax Year Pass** with generous freemium tier

- **Free Tier**: 30 receipts/year with full OCR
- **Paid Tier**: ¥1,500/year (~$10) for unlimited receipts per tax year
- **Positioning**: "Cheaper than one hour with your accountant"

---

## Context & Constraints

### Business Context
| Factor | Value |
|--------|-------|
| API Cost per Receipt | ~$0.01 (Gemini Vision) |
| Target User | Heavy users: 500-2000 receipts/year |
| Usage Pattern | Tax season burst (Feb-March) |
| User Sophistication | Non-technical (lawyers, consultants) |
| Competition | Exists but overpriced, poor UX, limited free trial |
| Creator Goal | Many users, convert later |

### Key Technical Insight
Users can upload unlimited receipts to IndexedDB (free, client-side storage), but OCR only runs when requested. This enables a **"gate after value preview"** model:
- User uploads 500 receipts → stored locally (no cost)
- System processes first 30 free → user sees AI magic working
- Remaining 470 show "Unlock with Tax Year Pass" → payment gate
- After payment → batch process everything

This is the core monetisation lever.

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

## Recommended Strategy: Freemium + Annual Pass

### Tier Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                        FREE TIER                                 │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Upload unlimited receipts (stored locally)                   │
│  ✅ AI OCR for first 30 receipts per tax year                    │
│  ✅ Full editing and review of processed receipts                │
│  ✅ Excel export of processed receipts (all 4 sheets)            │
│  ✅ No credit card required                                      │
│  ❌ Remaining receipts show "locked" status                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              TAX YEAR PASS - ¥1,500/year (~$10)                  │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Everything in Free                                           │
│  ✅ Unlimited AI OCR for that tax year                           │
│  ✅ Batch processing (process all at once)                       │
│  ✅ Priority processing during tax season                        │
│  ✅ Receipt statistics and insights                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              PREVIOUS YEAR ADD-ON - ¥1,000                       │
├─────────────────────────────────────────────────────────────────┤
│  For users who need to process last year's receipts              │
│  (e.g., processing 2024 receipts in 2026)                        │
└─────────────────────────────────────────────────────────────────┘
```

### Why 30 Free Receipts?

| Amount | Rationale |
|--------|-----------|
| < 20 | Not enough to prove value for heavy users |
| 30 | ~1 month of receipts for busy professional, proves AI quality |
| > 50 | Too generous, reduces conversion pressure |

**30 receipts = $0.30 cost** per free user. Acceptable CAC if conversion rate > 10%.

### Pricing Rationale

```
Heavy user scenario:
- 1,000 receipts × $0.01 = $10 API cost
- Price at ¥1,500 (~$10) = break-even on heavy users
- Most users have 200-500 receipts = healthy margin

Light user scenario:
- 100 receipts × $0.01 = $1 API cost
- Price at ¥1,500 = $9 margin

Blended margin: ~70% assuming normal distribution
```

### Competitive Positioning

| Competitor | Price | Our Advantage |
|------------|-------|---------------|
| Freee | ¥1,980/month | 10x cheaper per year |
| MoneyForward | ¥800/month | 6x cheaper per year |
| Manual Excel | Free | 10+ hours saved |

**Messaging**: "Process a year of receipts for less than the cost of one bento."

---

## User Journey & Conversion Points

### Journey Map

```
1. DISCOVERY
   User searches "領収書 OCR" or "確定申告 レシート"
   └→ Lands on landing page

2. FIRST VALUE (No signup required)
   └→ Uploads 5-10 receipts
   └→ Sees AI extract data perfectly
   └→ "Wow, this actually works!"

3. FREE TIER USAGE
   └→ Processes up to 30 receipts
   └→ Exports to Excel, sees beautiful output
   └→ Uploads more receipts...

4. CONVERSION TRIGGER ← Key moment
   └→ Receipt #31 shows "🔒 Unlock with Tax Year Pass"
   └→ User has 200+ receipts waiting
   └→ User sees: "Process 200 receipts for ¥1,500"
   └→ Stripe Checkout opens

5. PAID EXPERIENCE
   └→ Batch processes all receipts
   └→ Exports complete Excel file
   └→ Files taxes successfully

6. RETENTION
   └→ Next year: "Your 2026 Tax Year Pass - ¥1,500"
   └→ Already has app habit, converts again
```

### Conversion Triggers

| Trigger | When | Message |
|---------|------|---------|
| Soft limit | 25 receipts | "5 free receipts remaining" |
| Hard limit | 31st receipt | "🔒 Upgrade to process unlimited receipts" |
| Export gate | Export with locked receipts | "X receipts not included. Unlock all?" |
| Tax deadline | February | "Tax deadline approaching! Process all receipts now" |

---

## Abuse Prevention

### Threat Model

| Attack | Likelihood | Mitigation |
|--------|------------|------------|
| Multiple free accounts | High | Browser fingerprint + email verification |
| Clearing IndexedDB | Medium | Server-side usage tracking (optional) |
| Bot abuse | Low | Rate limiting (already implemented) |

### Recommended Mitigations

**Tier 1 (Implement now)**:
- Email required for free tier (light friction, prevents casual abuse)
- Rate limiting: 10 requests/minute/IP (already done)
- Browser fingerprint stored with usage count

**Tier 2 (If abuse becomes problem)**:
- Server-side usage tracking per email
- Phone verification for free tier
- Captcha on batch processing

**Tier 3 (Nuclear option)**:
- Require payment method on file for free tier (kills conversion)
- Only implement if abuse is severe

### Acceptable Abuse Level

Given:
- 30 free receipts = $0.30 cost
- Side project with flexible economics
- Goal is user adoption

**Policy**: Accept up to 20% abuse rate. If someone creates 3 accounts to process 90 receipts free, they've spent significant time and might convert next year. Marketing cost.

---

## Implementation Plan

### Phase 1: MVP Launch (Pre-revenue)
- [x] Core OCR functionality
- [x] Local storage with IndexedDB
- [x] Excel export
- [ ] Free tier counter (30 receipts)
- [ ] "Locked receipt" UI state
- [ ] Email capture for free tier

### Phase 2: Payment Integration
- [ ] Stripe integration
- [ ] Tax Year Pass product setup
- [ ] Payment success → unlock all receipts
- [ ] Receipt/invoice generation

### Phase 3: Conversion Optimization
- [ ] Soft limit warnings (25 receipts)
- [ ] Upgrade prompts in UI
- [ ] Email reminders for users with locked receipts
- [ ] Tax deadline campaigns

### Phase 4: Retention
- [ ] Annual renewal reminders
- [ ] "Previous Year Pass" upsell
- [ ] Usage statistics email

---

## Metrics to Track

### Funnel Metrics
| Metric | Target | Notes |
|--------|--------|-------|
| Visitors → Upload | 30% | Landing page effectiveness |
| Upload → 10 receipts | 50% | Initial value demonstration |
| 10 → 30 receipts | 40% | Free tier engagement |
| 30 → Paid | 15% | Conversion rate |

### Unit Economics
| Metric | Target |
|--------|--------|
| CAC (Free tier cost) | < $0.50 |
| Conversion rate | > 10% |
| ARPU | ¥1,500 |
| API cost per paid user | < ¥500 (~$3.50) |
| Gross margin | > 60% |

### Health Metrics
| Metric | Alert Threshold |
|--------|-----------------|
| Abuse rate | > 20% |
| Free tier cost/month | > $100 |
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
| **Model** | Freemium + Annual Pass | Matches tax season burst, simple pricing |
| **Free Limit** | 30 receipts/year | Proves value, acceptable CAC |
| **Price** | ¥1,500/year | Sweet spot: covers costs, feels cheap |
| **Abuse Prevention** | Email + rate limit + fingerprint | Light friction, acceptable abuse rate |
| **Primary CTA** | "Get your 2025 Tax Year Pass" | Clear, time-bound, action-oriented |

**One-liner pitch**: "Process all your receipts for ¥1,500/year. Cheaper than lunch."
