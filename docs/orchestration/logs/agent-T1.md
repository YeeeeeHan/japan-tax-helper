# Agent Log: T1

## Status: completed
## Started: 2026-01-19T00:01:00Z
## Completed: 2026-01-19T00:15:00Z

### Key Findings

Thoroughly analyzed NTA template structures (kichou04.xlsx and web_all.xlsx), e-Tax export requirements, and current export implementation.

### Template Structures

#### kichou04.xlsx (帳簿の様式例 - Ledger Template)

**Workbook Structure:**
- **2 sheets**: "１項" (Page 1) and "次項" (Continuation Page)
- **Purpose**: Official NTA bookkeeping template for business income (事業所得者用)

**Sheet "１項" (First Page) - Columns A through U (21 columns):**

1. **Header Row (Row 2)**: "帳簿の様式例（事業所得者用）"
2. **Column Headers (Rows 3-6)**: Multi-level headers with merged cells

   **Core Transaction Columns:**
   - Columns A-B: Date (年/月/日)
   - Column C: 摘要 (Description)
   - Column D: 売上 (Sales)
   - Column E: 仕入 (Purchases)
   - Column F: 雑収入等 (Misc Income)

   **Expense Category Columns (Columns G-L):**
   - Column H: 給料賃金 (Salaries & Wages)
   - Column I: 外注工賃 (Outsourcing Costs)
   - Column J: 減価償却費 (Depreciation)
   - Column K: 貸倒金 (Bad Debts)
   - Column L: 地代家賃 (Rent)

   **Other Expense Columns (Columns M-U):**
   - Column N: 利子割引料 (Interest & Discounts)
   - Column O: 租税公課 (Taxes)
   - Column P: 水道光熱費 (Utilities)
   - Column Q: 旅費交通費 (Travel & Transportation)
   - Column R: 通信費 (Communication)
   - Column S: 修繕費 (Repairs)
   - Column T: 消耗品費 (Consumables)
   - Column U: 雑費 (Miscellaneous)

3. **Data Rows**: 20 transaction rows with 24pt height
4. **Formatting**: All cells have thin borders, amount columns right-aligned

**Key Features:**
- Matches NTA official 経費科目 perfectly
- Date-based transaction recording (年/月/日)
- Pre-formatted for printing on A4 landscape

---

#### web_all.xlsx (e-Tax Standard Forms)

**Workbook Structure - 6 sheets:**
1. 給与所得375 (Salary - Form 375)
2. 退職所得316 (Retirement - Form 316)
3. **報酬309** (Compensation/Fees - Form 309) ← Focus
4. 不動産使用料313 (Real Estate Usage - Form 313)
5. 不動産譲受376 (Real Estate Transfer - Form 376)
6. 不動産売買314 (Real Estate Brokerage - Form 314)

**Form 309 (報酬・料金等の支払調書) - 137 columns:**

**Submitter Information (Columns A-K):**
- A: 支払調書等の種類 → "309" (半角)
- D: 提出義務者の住所又は所在地 → Full-width ≤60 chars
- E: 提出義務者の氏名又は名称 → Full-width ≤30 chars
- K: 年分 (Tax Year) → Half-width 2 chars

**Payment Details:**
- P-U: 支払金額 (Payment Amount)
- AM-AO: 源泉徴収税額 (Withholding Tax Amount)
- BH-BK: T-Number fields

**Critical Requirements:**
- Half-width (半角): Numbers, codes, T-Numbers
- Full-width (全角): Japanese text, names, addresses
- SHIFT-JIS encoding for CSV
- Fixed column order (cannot reorder)

---

### Current Export Implementation

#### excel.ts (699 lines)
**Current 5 sheets:**
1. 領収書一覧 (Receipts) - 11 columns
2. 集計 (Summary by Category)
3. 要確認 (Flagged for Review)
4. 領収書画像 (Receipt Images)
5. 減価償却対象 (Depreciation Assets)

**Issues:**
- Does NOT match NTA ledger structure
- Missing date grouping with subtotals
- T-Number not prominent enough

#### csv.ts (272 lines)
**Features:**
- ✅ SHIFT-JIS encoding
- ✅ CRLF line endings
- ⚠️ Field order doesn't match Form 309
- ⚠️ Missing Form 309 required fields

---

### Invoice System (適格請求書) Requirements

**Required Fields:**
1. T-Number: T + 13 digits
2. Issuer name/address
3. Transaction date
4. Description
5. Tax breakdown (8%/10%)
6. Total amount

**Current Implementation:**
- ✅ All fields captured in Receipt type
- ✅ T-Number validation correct
- ✅ Tax breakdown by rate implemented
- ⚠️ T-Number not prominent in exports

---

### For Other Agents

#### T2 (Ledger Schema) Needs:
- Column mapping: Receipt → kichou04.xlsx structure
- Date grouping strategy (daily/monthly subtotals)
- Category → column mapping

```typescript
interface LedgerRow {
  date: Date;
  description: string;
  // ONE of these based on category:
  salaries?: number;
  outsourcing?: number;
  depreciation?: number;
  badDebts?: number;
  rent?: number;
  interest?: number;
  taxes?: number;
  utilities?: number;
  travel?: number;
  communication?: number;
  repairs?: number;
  consumables?: number;
  misc?: number;
}
```

#### T3 (Form 309) Needs:
- NEW SubmitterInfo interface required
- Withholding tax calculation:
  - ≤¥1M: 10.21%
  - >¥1M: 10.21% on first ¥1M + 20.42% on excess
- Character type conversion functions (half/full-width)
- **Note**: Form 309 is for PAYING others, may not apply to expense tracking

#### T6 (Invoice Enhancement) Needs:
- Move T-Number to column 2 in exports
- Add conditional formatting (green=valid, red=invalid)
- Expand tax breakdown details
- Create validation report sheet

---

### Artifacts Created

| Path | Description |
|------|-------------|
| docs/orchestration/logs/agent-T1.md | This analysis log |

### Errors
None
