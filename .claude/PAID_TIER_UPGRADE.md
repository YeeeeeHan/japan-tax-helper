# Gemini API Paid Tier Upgrade Guide

## Why Upgrade?

### Current Limits (Free Tier)
- **5 RPM** (requests per minute) - Very restrictive for batch processing
- **250K TPM** (tokens per minute)
- **1,000 RPD** (requests per day)

### After Upgrade (Paid Tier 1 - $20/month minimum)
- **150 RPM** (30x increase!)
- **4M TPM** (tokens per minute)
- **10,000 RPD** (requests per day)

### Cost Comparison

| Scenario | Free Tier | Paid Tier 1 |
|----------|-----------|-------------|
| 20 receipts/day | $0.032/day | $0.032/day |
| 100 receipts/day | Rate limited | $0.16/day + $20/month |
| 1,000 receipts/month | Rate limited | $1.60 + $20 = $21.60/month |

**Break-even point:** ~500 receipts/month makes paid tier worth it

---

## Step-by-Step Upgrade Process

### Step 1: Go to Google AI Studio

1. Visit: https://aistudio.google.com/apikey
2. Sign in with your Google account (the one with your current API key)
3. You should see your existing API key listed

### Step 2: Enable Billing

1. Click the **"Enable billing"** button next to your API key
   - If you don't see this button, billing may already be enabled
2. You'll be redirected to Google Cloud Console
3. Click **"Link a billing account"**
4. Choose an existing billing account OR create a new one:
   - Provide credit card information
   - Set up billing alerts (recommended: $50/month)
5. Confirm and return to AI Studio

### Step 3: Verify Upgrade

1. Go back to https://aistudio.google.com/usage
2. Click on **"Rate limits"** tab
3. Verify you see:
   - **RPM: 150** (instead of 5)
   - **TPM: 4,000,000** (instead of 250,000)

**Important:** Your existing API key automatically gets higher limits - no need to generate a new key!

### Step 4: Update Environment Variables

#### For Local Development

Edit `.env.local`:

```bash
# No change needed - same API key works!
GEMINI_API_KEY=your_existing_key_here

# Increase rate limit to match paid tier capacity
RATE_LIMIT_MAX=100
```

#### For Vercel Production

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** > **Environment Variables**
4. Update `RATE_LIMIT_MAX`:
   - Old value: `10`
   - New value: `100`
5. Click **Save**
6. **Redeploy** for changes to take effect

---

## Testing Your Upgrade

### Test 1: Verify Rate Limit Increase

```bash
# This script sends 20 requests in quick succession
# Free tier: 15 will fail with 429
# Paid tier: All should succeed

for i in {1..20}; do
  curl -X POST http://localhost:3002/api/extract \
    -F "file=@sample_receipts/photo_1_2026-01-12_16-20-07.jpg" \
    &
done
wait

echo "Check logs - paid tier should show 20 successes, free tier ~5 successes"
```

### Test 2: Batch Upload in UI

1. Upload 30 receipts at once
2. Click "Process all"
3. **Free tier:** ~20 will fail with rate limit errors
4. **Paid tier:** All should process successfully

### Test 3: Monitor Costs

1. Go to https://console.cloud.google.com/billing
2. Select your billing account
3. View **"Reports"** to see daily costs
4. With Gemini 2.5 Flash:
   - 100 receipts = **$0.16**
   - 1,000 receipts = **$1.60**

---

## Configuration Updates

### Server-Side Rate Limit

**File:** `/src/app/api/extract/route.ts` (line 13)

```typescript
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT_MAX || '10', 10);
```

**Recommended Values:**
- Free tier: `RATE_LIMIT_MAX=5` (match Gemini API limit)
- Paid tier: `RATE_LIMIT_MAX=100` (safe margin below 150 RPM)

### Processing Speed

With paid tier + parallel processing (Phase 4):
- **Sequential:** ~60 receipts/hour
- **Parallel (5 concurrent):** ~150 receipts/hour

---

## Downgrade Instructions

If you need to downgrade back to free tier:

1. Go to https://console.cloud.google.com/billing
2. Select your billing account
3. Click **"Close billing account"**
4. Update environment variables:
   ```bash
   RATE_LIMIT_MAX=5
   ```

**Note:** Downgrading takes effect immediately. Your API key returns to free tier limits.

---

## Troubleshooting

### "Still Getting 429 Errors After Upgrade"

**Possible Causes:**
1. **Server rate limit too high:** Lower `RATE_LIMIT_MAX` to 100
2. **Upgrade not applied:** Check https://aistudio.google.com/usage - should show 150 RPM
3. **Multiple projects:** Ensure you upgraded the correct Google Cloud project
4. **Propagation delay:** Wait 5 minutes after enabling billing

**Solution:**
```bash
# Check which project your API key belongs to
curl https://generativelanguage.googleapis.com/v1/models \
  -H "x-goog-api-key: YOUR_KEY" | jq .
```

### "Unexpected Costs"

**Gemini 2.5 Flash Pricing:**
- **Input:** $0.00001875 per 1K chars (~$0.0016 per receipt image)
- **Output:** $0.000075 per 1K chars (JSON response, ~$0.0001 per receipt)
- **Total:** ~$0.0017 per receipt

**Monthly estimate:**
- 100 receipts/day × 30 days = 3,000 receipts
- Cost: 3,000 × $0.0017 = **$5.10/month** for API calls
- Plus: **$20/month** base fee for paid tier
- **Total: ~$25/month**

### "API Key Not Working After Upgrade"

1. Verify billing is actually enabled: https://console.cloud.google.com/billing
2. Check API key hasn't expired
3. Regenerate API key if needed (rare)
4. Restart your Next.js dev server to pick up new env vars

---

## FAQ

**Q: Do I need a new API key after upgrading?**
A: No, your existing key automatically gets higher limits.

**Q: Can I upgrade just for one month?**
A: Yes, cancel billing anytime. Minimum charge is $20 for the month you use it.

**Q: What happens if I exceed 150 RPM on paid tier?**
A: You'll get 429 errors. Consider Tier 2 ($200/month) for 1,000 RPM.

**Q: Is there a free trial?**
A: Google Cloud offers $300 free credit for 90 days (new accounts).

**Q: Can I set a spending limit?**
A: Yes! Set budget alerts in Cloud Console: https://console.cloud.google.com/billing/budgets

---

## Recommended Setup

For production use with Japan Tax Helper:

```bash
# .env.local (development)
GEMINI_API_KEY=your_paid_tier_key_here
RATE_LIMIT_MAX=100
OCR_STRATEGY=gemini-2.5-flash

# For heavy usage (enterprise)
RATE_LIMIT_MAX=500
OCR_STRATEGY=gemini-2.5-flash
```

**Vercel Environment Variables** (production):
- `GEMINI_API_KEY`: Your API key
- `RATE_LIMIT_MAX`: `100`
- `OCR_STRATEGY`: `gemini-2.5-flash`

---

**Last Updated:** January 13, 2026
**Gemini 2.5 Flash Pricing:** https://ai.google.dev/pricing
**Rate Limits Documentation:** https://ai.google.dev/gemini-api/docs/rate-limits
