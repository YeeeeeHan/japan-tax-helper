# e-Tax Export Format Research

## Overview

This document summarizes research on e-Tax CSV format specifications and NTA (National Tax Agency) requirements for improving the Japan Tax Helper Excel export functionality.

## Key Findings

### 1. e-Tax CSV Format Specifications

The NTA provides standardized CSV formats for submitting statutory reports (法定調書) through e-Tax.

**Source:** https://www.e-tax.nta.go.jp/e-taxsoftweb/hoteichosho/csv.htm

#### General CSV Rules:
- Fields must be separated by half-width commas (`,`)
- Empty fields should be blank (no spaces), except the **final field** which requires at least 1 character (space is acceptable)
- Character encoding: **SHIFT-JIS** (not UTF-8)
- All data must conform to e-Tax specified record content

#### Available Form Types (e-Tax WEB version):
| Code | Form Name (Japanese) | Description |
|------|---------------------|-------------|
| 375 | 給与所得の源泉徴収票 | Salary withholding certificate |
| 316 | 退職所得の源泉徴収票 | Retirement income withholding |
| 309 | 報酬、料金、契約金及び賞金の支払調書 | Compensation/fees payment statement |
| 313 | 不動産の使用料等の支払調書 | Real estate usage fees |
| 376 | 不動産等の譲受けの対価の支払調書 | Real estate transfer consideration |
| 314 | 不動産等の売買又は貸付けのあっせん手数料の支払調書 | Real estate brokerage commission |

### 2. Key Field Specifications (from web_all.xlsx)

#### Common Header Fields:
| Field Name (Japanese) | Field Name (English) | Format |
|-----------------------|---------------------|--------|
| 法定資料の種類 | Document type | Half-width, e.g., "375" |
| 整理番号1 | Reference number 1 | Half-width, 10 chars |
| 本支店等区分番号 | Branch code | Half-width, ≤5 chars |
| 提出義務者の住所（居所）又は所在地 | Submitter address | Full-width, ≤60 chars |
| 提出義務者の氏名又は名称 | Submitter name | Full-width, ≤30 chars |
| 提出義務者の電話番号 | Submitter phone | Half-width, ≤15 chars |
| 年分 | Tax year | Half-width, 2 chars |
| 訂正表示 | Correction indicator | Half-width, 1 char |

#### Payment/Amount Fields:
| Field Name (Japanese) | Description |
|-----------------------|-------------|
| 支払金額 | Payment amount |
| 未払金額 | Unpaid amount |
| 源泉徴収税額 | Withholding tax amount |
| 未徴収税額 | Uncollected tax amount |

#### Character Width Rules:
- **Half-width (半角)**: Numbers, ASCII characters
- **Full-width (全角)**: Japanese text, addresses, names

### 3. Individual Business Owner (個人事業主) Bookkeeping Format

**Source:** https://www.nta.go.jp/taxes/shiraberu/shinkoku/kojin_jigyo/index.htm

#### Official Expense Categories (経費科目):
| Japanese | Romaji | English |
|----------|--------|---------|
| 租税公課 | Sozei Kouka | Taxes and public charges |
| 水道光熱費 | Suidou Kounetsuhi | Utilities |
| 旅費交通費 | Ryohi Koutsuuhi | Travel & transportation |
| 通信費 | Tsuushinhi | Communication |
| 修繕費 | Shuuzenhi | Repairs |
| 消耗品費 | Shoumouhinhi | Consumables |
| 雑費 | Zappi | Miscellaneous |
| 給料賃金 | Kyuuryou Chingin | Salaries & wages |
| 外注工賃 | Gaichuu Kouchin | Outsourcing costs |
| 減価償却費 | Genka Shoukyakuhi | Depreciation |
| 貸倒金 | Kashidaorekin | Bad debts |
| 地代家賃 | Chidai Yachin | Rent |
| 利子割引料 | Rishi Waribikiryou | Interest & discounts |

#### Required Bookkeeping Fields (White/Blue Return):
| Field | Japanese | Description |
|-------|----------|-------------|
| Date | 年/月/日 | Transaction date |
| Description | 摘要 | Transaction description |
| Sales | 売上 | Sales income |
| Purchases | 仕入 | Cost of goods |
| Misc Income | 雑収入等 | Other income |
| Expenses | 経費 | Business expenses (by category) |

### 4. Record Keeping Requirements

#### Required Records for Tax Filing:
1. **Transaction date** (取引の年月日)
2. **Counterparty** (売上先・仕入先その他の相手方の名称)
3. **Amount** (金額)
4. **Daily totals** (日々の売上げ・仕入れ・経費の金額)

#### Document Retention Periods:
| Document Type | Retention |
|--------------|-----------|
| Legal ledger (法定帳簿) | 7 years |
| Optional ledger (任意帳簿) | 5 years |
| Settlement documents | 5 years |
| Invoices, receipts, etc. | 5 years |

### 5. Recommendations for Excel Export Improvements

#### A. Add CSV Export Option
Export data in e-Tax compatible CSV format:
- Use SHIFT-JIS encoding
- Follow field order from standard forms
- Include proper field separators
- Handle empty fields correctly (blank vs space for last field)

#### B. Align Expense Categories
Update current categories to match NTA official categories:
```typescript
// Current app categories should map to:
const NTA_EXPENSE_CATEGORIES = [
  '旅費交通費',      // Travel & Transportation
  '通信費',          // Communication
  '水道光熱費',      // Utilities
  '消耗品費',        // Consumables
  '修繕費',          // Repairs
  '地代家賃',        // Rent
  '租税公課',        // Taxes
  '給料賃金',        // Salaries
  '外注工賃',        // Outsourcing
  '減価償却費',      // Depreciation
  '貸倒金',          // Bad debts
  '利子割引料',      // Interest
  '雑費',            // Miscellaneous
  '交際費',          // Entertainment (commonly used)
  '接待交際費',      // Entertainment expenses
  '広告宣伝費',      // Advertising
  '福利厚生費',      // Employee welfare
];
```

#### C. Add Bookkeeping Export Format
Create a ledger-style export that matches NTA template:
- Columns: Date, Description, Income, Expenses (by category)
- Row format matching 帳簿の様式例
- Include daily and monthly subtotals

#### D. Invoice System (適格請求書) Fields
Ensure exports include:
- T-Number (適格請求書発行事業者登録番号)
- Tax breakdown (8% / 10%)
- Tax-inclusive/exclusive amounts

### 6. Technical Implementation Notes

#### CSV File Generation:
```typescript
// Example CSV generation for e-Tax compatibility
function generateETaxCSV(data: Receipt[]): string {
  // Use SHIFT-JIS encoding
  const encoder = new TextEncoder();

  // Build CSV with proper field order
  const rows = data.map(receipt => [
    receipt.documentType || '309',  // 法定資料の種類
    receipt.referenceNumber || '',   // 整理番号1
    // ... other fields in order
  ].join(','));

  // Last field must have at least 1 char
  rows.forEach((row, i) => {
    if (row.endsWith(',')) {
      rows[i] = row + ' ';
    }
  });

  return rows.join('\r\n');
}
```

#### Encoding Conversion:
For SHIFT-JIS encoding in browser:
```typescript
import iconv from 'iconv-lite';

function encodeShiftJIS(text: string): Buffer {
  return iconv.encode(text, 'Shift_JIS');
}
```

## Resources

- [e-Tax CSV Standard Forms](https://www.e-tax.nta.go.jp/e-taxsoftweb/hoteichosho/csv.htm)
- [Individual Business Bookkeeping Guide](https://www.nta.go.jp/taxes/shiraberu/shinkoku/kojin_jigyo/index.htm)
- [CSV File Check Corner](https://www.e-tax.nta.go.jp/csvcheck/csvcheck.htm)
- [Account Details CSV Creation Method](https://www.e-tax.nta.go.jp/hojin/gimuka/csv_jyoho2.htm)

## Downloaded Templates

The following templates have been downloaded to the `research/` folder:
- `web_all.xlsx` - e-Tax standard form (all statutory reports)
- `kichou04.xlsx` - NTA bookkeeping template for business income

---

*Research conducted: January 2026*
*Sources: National Tax Agency (NTA) e-Tax system*
