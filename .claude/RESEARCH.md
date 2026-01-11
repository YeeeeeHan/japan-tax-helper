# Japanese Tax Law & Compliance Research

## Overview

This document contains research findings on Japanese tax requirements for receipt management and the 適格請求書等保存方式 (Qualified Invoice System).

---

## 適格請求書等保存方式 (Qualified Invoice System)

### Background

- **Introduced**: October 1, 2023
- **Purpose**: Improve consumption tax credit transparency
- **Applies to**: All businesses claiming consumption tax deductions
- **Authority**: 国税庁 (National Tax Agency - NTA)

### System Requirements

For a receipt to qualify as a 適格請求書 (qualified invoice), it **must** contain:

1. **発行事業者名** (Issuer's Business Name)
   - Full legal name of the business
   - Must match registration records

2. **登録番号** (Registration Number - T-Number)
   - Format: `T` + 13 digits
   - Example: `T1234567890123`
   - Publicly verifiable on NTA website
   - **Critical**: Without this, businesses cannot claim full tax deduction

3. **取引年月日** (Transaction Date)
   - Date of the transaction
   - Format: Year/Month/Day

4. **取引内容** (Transaction Details)
   - Description of goods or services provided
   - Can be general (e.g., "飲食代", "事務用品")

5. **税率ごとの合計金額** (Total Amount by Tax Rate)
   - Separate totals for 8% and 10% items
   - Must be clearly indicated

6. **税率ごとの消費税額** (Tax Amount by Rate)
   - Calculated tax amount for each rate
   - Must match the calculation

7. **受領者名** (Recipient Name)
   - **Optional for simplified invoices** (簡易適格請求書)
   - Required for full invoices

### Simplified Qualified Invoices (簡易適格請求書)

Certain businesses can issue simplified invoices:
- Retail stores
- Restaurants
- Taxi companies
- Businesses serving unspecified customers

**Simplified invoices require fewer fields:**
- Can omit recipient name
- Only need **either** tax rate **or** tax amount (not both)

---

## Consumption Tax Rates (消費税率)

### Current Rates (as of 2026)

| Rate | Applies To | Japanese Term |
|------|------------|---------------|
| 10% | Most goods and services | 標準税率 |
| 8% | Food (excluding alcohol, dining out), Newspapers (twice weekly+) | 軽減税率 |

### Tax Calculation

**Standard Formula:**
```
消費税額 = 税抜金額 × 税率
合計金額 = 税抜金額 + 消費税額
```

**Example (10% rate):**
```
税抜金額: ¥10,000
消費税額: ¥1,000 (¥10,000 × 0.10)
合計金額: ¥11,000
```

### Mixed Tax Rates

Many receipts contain both 8% and 10% items:

**Example:**
```
Food items (8%):      ¥1,000  →  Tax: ¥80   →  Total: ¥1,080
Other items (10%):    ¥2,000  →  Tax: ¥200  →  Total: ¥2,200
                                        ─────────────────────
                                        Grand Total: ¥3,280
```

**Important**: Our app must:
- Detect both tax rates
- Calculate each separately
- Sum correctly
- Validate the calculation

---

## Tax Deduction Transition Period

### 2023-2026 Period (Current)

**October 1, 2023 - September 30, 2026:**
- Businesses can claim **80%** of consumption tax even if the supplier doesn't have a T-Number
- Transitional measure to ease into new system

**October 1, 2026 - September 30, 2029:**
- Deduction drops to **50%** for non-registered suppliers
- **Important deadline**: September 30, 2026

**After September 30, 2029:**
- **0%** deduction for non-registered suppliers
- Full T-Number compliance required

### Impact on Our App

- ⚠️ **Flag receipts without T-Numbers** as potentially problematic
- Show warning: "この領収書には登録番号がありません。2026年10月以降、税額控除が制限される可能性があります"
- Separate sheet in Excel for non-compliant receipts

---

## Expense Categories for 個人事業主 (Individual Business Owners)

### Standard Categories

Based on 確定申告 (tax return) requirements:

| Category | Japanese | Common Examples |
|----------|----------|----------------|
| Travel & Transportation | 旅費交通費 | タクシー、電車、飛行機、ホテル、駐車場 |
| Entertainment | 交際費 | 飲食、接待、ギフト |
| Consumables | 消耗品費 | 文具、事務用品、備品（<¥100,000） |
| Communication | 通信費 | 携帯、電話、インターネット |
| Utilities | 水道光熱費 | 電気、ガス、水道 |
| Advertising | 広告宣伝費 | 広告、マーケティング、SNS広告 |
| Insurance | 損害保険料 | 火災保険、自動車保険、損保 |
| Taxes & Dues | 租税公課 | 印紙、切手、税金、手数料 |
| Rent | 地代家賃 | 家賃、事務所賃料 |
| Outsourcing | 外注費 | 業務委託、外部委託費用 |
| Meetings | 会議費 | 会議室代、セミナー参加費 |
| Training | 研修費 | 研修、教育、スクール |
| Books & Publications | 新聞図書費 | 新聞、書籍、雑誌 |

### Categorization Tips

**Key Merchant Keywords:**

**旅費交通費:**
- タクシー, TAXI, JR, 電車, Metro, Suica, PASMO
- ANA, JAL, 航空, ホテル, HOTEL
- 駐車場, パーキング, ETC, 高速

**交際費:**
- レストラン, 居酒屋, カフェ, Starbucks
- BAR, 飲食, ダイニング
- ギフト, プレゼント

**消耗品費:**
- Amazon, 文具, 事務用品, コピー, インク
- ヨドバシ, ビックカメラ, LOHACO

**通信費:**
- docomo, au, SoftBank, 楽天モバイル
- Wi-Fi, インターネット, プロバイダ

---

## Receipt Retention Requirements

### How Long to Keep Receipts

**Individual Business Owners (個人事業主):**
- **White Form (白色申告)**: 5 years
- **Blue Form (青色申告)**: 7 years

**Corporations (法人):**
- 7 years (or 10 years in some cases)

### Storage Requirements

**Acceptable formats:**
- ✅ Paper originals
- ✅ Scanned images (with certain conditions)
- ✅ Digital receipts (e-invoices)

**Our app helps by:**
- Storing high-quality compressed images
- Exporting to Excel for archival
- Maintaining original date/amount metadata

---

## T-Number Verification

### Official NTA Database

**Website**: [https://www.invoice-kohyo.nta.go.jp/](https://www.invoice-kohyo.nta.go.jp/)

**What you can check:**
- T-Number validity
- Business name
- Registration status
- Registration date

### API Access (Future Enhancement)

**Current**: No official public API
**Workaround**: Web scraping (not reliable)
**Future**: If NTA releases API, integrate for real-time verification

### Manual Verification Process

1. Extract T-Number from receipt
2. Go to NTA website
3. Enter T-Number
4. Verify business name matches
5. Check registration is active

**Our app currently:**
- Validates format only (`/^T\d{13}$/`)
- Shows "Verify" button linking to NTA website
- Future: Automatic API verification

---

## Common Compliance Issues

### 1. Missing T-Numbers

**Problem**: Small businesses haven't registered yet
**Impact**: Limited tax deduction after 2026
**Solution**: Flag in app, warn user, separate Excel sheet

### 2. Incorrect Tax Calculations

**Problem**: Receipt shows wrong tax amount
**Cause**: Rounding errors, manual calculation mistakes
**Solution**: Validate in app, flag mismatches

### 3. Unclear Tax Rates

**Problem**: Receipt doesn't specify 8% vs 10%
**Impact**: Cannot determine deductible amount
**Solution**: Ask user to clarify, flag for review

### 4. Illegible Receipts

**Problem**: Faded thermal paper, poor photo quality
**Impact**: Cannot verify amounts
**Solution**: Low confidence score, flag for manual entry

---

## Data Validation Rules Implemented

### 1. T-Number Format Validation

```regex
/^T\d{13}$/
```

**Valid**: `T1234567890123`
**Invalid**: `1234567890123`, `T123`, `T12345678901234`

### 2. Tax Calculation Validation

```typescript
calculatedTax = sum(taxBreakdown[].taxAmount)
expectedTax = totalAmount - subtotalExcludingTax

isValid = Math.abs(calculatedTax - expectedTax) <= 1
```

**Tolerance**: ±1円 (for rounding)

### 3. Tax Rate Validation

```typescript
validRates = [8, 10]
isValid = taxBreakdown.every(tb => validRates.includes(tb.taxRate))
```

### 4. Required Fields

```typescript
required = [
  'issuerName',
  'transactionDate',
  'description',
  'subtotalExcludingTax',
  'taxBreakdown',
  'totalAmount',
  'suggestedCategory'
]
```

---

## Research Sources

### Official Government Sources

1. **National Tax Agency (国税庁)**
   - [Invoice System Overview](https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/invoice_about.htm)
   - [T-Number Public Search](https://www.invoice-kohyo.nta.go.jp/)

2. **Government Portal**
   - [Invoice System Guide (政府広報)](https://www.gov-online.go.jp/article/202210/entry-10343.html)

### Industry Resources

3. **Freee (Competitor)**
   - [Expense Categories Guide](https://www.freee.co.jp/kb/kb-blue-return/account-title/)

4. **Yayoi**
   - [Individual Business Expenses](https://www.yayoi-kk.co.jp/shinkoku/oyakudachi/kojin-keihi/)

### Third-Party Guides

5. **EU-Japan Centre**
   - [Qualified Invoice System](https://www.eu-japan.eu/qualified-invoice-system)

6. **Stripe**
   - [Qualified Invoices in Japan](https://stripe.com/resources/more/qualified-invoices-in-japan)

7. **Tax Offices**
   - [Kaku Asumi Tax Office](https://en.zeirishi-kakuasumi.com/japans-qualified-invoice-system-and-t-number-registration-for-businesses/)

---

## Key Dates & Deadlines

| Date | Event |
|------|-------|
| Oct 1, 2023 | Qualified Invoice System begins |
| Sep 30, 2026 | 80% transition credit ends → drops to 50% |
| Sep 30, 2029 | All transition credits end → 0% for non-registered |
| Mar 15, 2027 | Tax filing deadline for 2026 income |

---

## Future Research Needed

1. ✅ **API Integration with NTA**
   - Monitor for official T-Number verification API
   - Implement when available

2. ✅ **Industry-Specific Requirements**
   - Different rules for different industries
   - Customize categories per profession

3. ✅ **Multi-Currency Receipts**
   - How to handle foreign currency
   - Conversion rate requirements
   - Documentation needed

4. ✅ **Digital Receipt Standards**
   - Electronic invoice requirements
   - PDF receipt validation
   - Email receipt handling

---

**Last Updated**: January 11, 2026
**Next Review**: Before Sep 30, 2026 (transition deadline)
