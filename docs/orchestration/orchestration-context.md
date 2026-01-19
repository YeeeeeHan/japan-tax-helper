# Orchestration Context: e-Tax Export Format Enhancements

## Meta

| Field | Value |
|-------|-------|
| Status | `planning` |
| Created | 2026-01-19 |
| Last Updated | 2026-01-19 |
| Total Tasks | 8 |
| Completed Tasks | 0 |
| Current Wave | 0 |
| Total Waves | 4 |

## Objective

Enhance the Japan Tax Helper export functionality to support official NTA (National Tax Agency) formats:

1. **Bookkeeping Ledger Export** (帳簿形式) - Match NTA template structure for official bookkeeping records
2. **e-Tax Form 309 Export** - Support Compensation/Fees Payment Statement (報酬・料金等の支払調書)
3. **Invoice System Compliance** - Ensure all required 適格請求書 fields are included in exports

## Dependency Graph

```
T1 (Analyze NTA templates)
    │
    ├──> T2 (Design ledger schema)
    │    │
    │    └──> T4 (Implement ledger export)
    │         │
    │         └──> T7 (Add ledger to UI)
    │
    ├──> T3 (Design Form 309 schema)
    │    │
    │    └──> T5 (Implement Form 309 export)
    │         │
    │         └──> T7 (Add Form 309 to UI)
    │
    └──> T6 (Enhance Invoice System fields in existing exports)
         │
         └──> T8 (Verify all exports)
```

## Task Queue

### Wave 1: Analysis (Parallel)
**Tasks:** T1

#### T1: Analyze NTA Template Structures
- **Agent Type:** `Explore`
- **Status:** `pending`
- **Dependencies:** None
- **Description:** Examine NTA templates (kichou04.xlsx, web_all.xlsx) to understand:
  - Ledger format structure (columns, grouping, subtotals)
  - Form 309 required fields and format
  - Field length limits, character encoding requirements
  - Sheet organization patterns
- **Inputs:**
  - `/Users/limyeehan/Documents/Code/side_hustle/japan-tax-helper/docs/research/export-formatting/kichou04.xlsx`
  - `/Users/limyeehan/Documents/Code/side_hustle/japan-tax-helper/docs/research/export-formatting/web_all.xlsx`
  - `/Users/limyeehan/Documents/Code/side_hustle/japan-tax-helper/docs/research/export-formatting/E-TAX-EXPORT-RESEARCH.md`
- **Outputs:**
  - Detailed schema documentation for ledger format
  - Detailed schema documentation for Form 309
  - List of Invoice System fields to add to existing exports
  - Key findings document with recommendations
- **Log Path:** `docs/orchestration/logs/agent-T1.md`

---

### Wave 2: Schema Design (Parallel)
**Tasks:** T2, T3, T6

#### T2: Design Ledger Schema and Data Mapping
- **Agent Type:** `general-purpose`
- **Status:** `pending`
- **Dependencies:** T1
- **Description:** Design TypeScript interfaces and data transformation logic for ledger export:
  - Define ledger row structure (date, description, income, expenses by category)
  - Design grouping strategy (daily/monthly subtotals)
  - Plan sheet structure (sales, purchases, expenses)
  - Create mapping from Receipt type to ledger format
- **Inputs:**
  - T1 findings: ledger schema documentation
  - `/Users/limyeehan/Documents/Code/side_hustle/japan-tax-helper/src/types/receipt.ts`
  - `/Users/limyeehan/Documents/Code/side_hustle/japan-tax-helper/src/lib/utils/constants.ts`
- **Outputs:**
  - TypeScript interface definitions for ledger rows
  - Data transformation function signatures
  - Sheet structure specification
- **Log Path:** `docs/orchestration/logs/agent-T2.md`

#### T3: Design Form 309 Schema and Data Mapping
- **Agent Type:** `general-purpose`
- **Status:** `pending`
- **Dependencies:** T1
- **Description:** Design TypeScript interfaces and data transformation logic for Form 309:
  - Define Form 309 row structure per e-Tax specification
  - Identify which receipt data maps to Form 309 fields
  - Design validation logic for required fields
  - Plan Excel vs CSV output strategy
- **Inputs:**
  - T1 findings: Form 309 schema documentation
  - `/Users/limyeehan/Documents/Code/side_hustle/japan-tax-helper/src/types/receipt.ts`
  - `/Users/limyeehan/Documents/Code/side_hustle/japan-tax-helper/docs/research/export-formatting/E-TAX-EXPORT-RESEARCH.md`
- **Outputs:**
  - TypeScript interface definitions for Form 309
  - Data mapping specification
  - Validation rules documentation
- **Log Path:** `docs/orchestration/logs/agent-T3.md`

#### T6: Enhance Invoice System Fields in Existing Exports
- **Agent Type:** `general-purpose`
- **Status:** `pending`
- **Dependencies:** T1
- **Description:** Update existing Excel and CSV exports to include all Invoice System required fields:
  - Add T-Number column to all relevant sheets
  - Add tax rate breakdown columns (8% vs 10%)
  - Add tax-inclusive/exclusive amount columns
  - Ensure proper labeling and formatting
  - Update export headers (ja/en)
- **Inputs:**
  - T1 findings: Invoice System field requirements
  - `/Users/limyeehan/Documents/Code/side_hustle/japan-tax-helper/src/lib/export/excel.ts`
  - `/Users/limyeehan/Documents/Code/side_hustle/japan-tax-helper/src/lib/export/csv.ts`
- **Outputs:**
  - Modified excel.ts with enhanced fields
  - Modified csv.ts with enhanced fields
  - Updated EXPORT_HEADERS with new field labels
- **Log Path:** `docs/orchestration/logs/agent-T6.md`

---

### Wave 3: Implementation (Parallel)
**Tasks:** T4, T5

#### T4: Implement Ledger Export Functionality
- **Agent Type:** `general-purpose`
- **Status:** `pending`
- **Dependencies:** T2
- **Description:** Implement ledger-style export to Excel:
  - Create new function `exportLedgerToExcel()` in excel.ts
  - Implement data grouping (by date, category)
  - Generate subtotals (daily, monthly)
  - Create separate sheets for: 売上 (Sales), 仕入 (Purchases), 経費 (Expenses)
  - Apply NTA template formatting (borders, headers, fonts)
  - Handle Japanese date formatting (年/月/日)
- **Inputs:**
  - T2 outputs: TypeScript interfaces and mapping logic
  - `/Users/limyeehan/Documents/Code/side_hustle/japan-tax-helper/src/lib/export/excel.ts`
  - `/Users/limyeehan/Documents/Code/side_hustle/japan-tax-helper/src/lib/utils/format.ts`
- **Outputs:**
  - New `exportLedgerToExcel()` function in excel.ts
  - Helper functions for grouping and subtotals
  - NTA-compliant ledger Excel file generation
- **Log Path:** `docs/orchestration/logs/agent-T4.md`

#### T5: Implement Form 309 Export Functionality
- **Agent Type:** `general-purpose`
- **Status:** `pending`
- **Dependencies:** T3
- **Description:** Implement Form 309 export (initially Excel format for review):
  - Create new function `exportForm309ToExcel()` in excel.ts
  - Implement field validation per e-Tax requirements
  - Generate Form 309 sheet with proper columns
  - Add instructional header rows (form code 309, submission info)
  - Handle half-width/full-width character requirements
  - Format currency and date fields correctly
- **Inputs:**
  - T3 outputs: TypeScript interfaces and validation rules
  - `/Users/limyeehan/Documents/Code/side_hustle/japan-tax-helper/src/lib/export/excel.ts`
  - `/Users/limyeehan/Documents/Code/side_hustle/japan-tax-helper/src/lib/utils/format.ts`
- **Outputs:**
  - New `exportForm309ToExcel()` function in excel.ts
  - Field validation helper functions
  - Form 309 Excel export capability
- **Log Path:** `docs/orchestration/logs/agent-T5.md`

---

### Wave 4: UI Integration and Testing (Sequential)
**Tasks:** T7, T8

#### T7: Add New Export Options to Dashboard UI
- **Agent Type:** `general-purpose`
- **Status:** `pending`
- **Dependencies:** T4, T5, T6
- **Description:** Update dashboard UI to expose new export formats:
  - Add "Export Ledger (帳簿形式)" button/option
  - Add "Export Form 309 (支払調書)" button/option
  - Update existing export buttons to reflect enhanced fields
  - Add tooltips/help text explaining each export format
  - Ensure proper loading states during export
  - Handle export errors gracefully
- **Inputs:**
  - T4 output: `exportLedgerToExcel()` function
  - T5 output: `exportForm309ToExcel()` function
  - `/Users/limyeehan/Documents/Code/side_hustle/japan-tax-helper/src/app/dashboard/page.tsx`
  - `/Users/limyeehan/Documents/Code/side_hustle/japan-tax-helper/src/components/shared/*`
- **Outputs:**
  - Modified dashboard page with new export buttons
  - Updated UI components
  - User-facing documentation (inline help text)
- **Log Path:** `docs/orchestration/logs/agent-T7.md`

#### T8: Verify All Export Formats
- **Agent Type:** `general-purpose`
- **Status:** `pending`
- **Dependencies:** T7
- **Description:** Test all export formats with sample data:
  - Test ledger export with various receipt categories
  - Test Form 309 export with sample payment data
  - Verify enhanced Invoice System fields appear in all exports
  - Check Excel file opens correctly in Microsoft Excel and LibreOffice
  - Verify Japanese text encoding (no mojibake)
  - Verify SHIFT-JIS encoding for CSV exports
  - Test with edge cases (empty data, single receipt, 100+ receipts)
  - Document any limitations or known issues
- **Inputs:**
  - All implemented export functions
  - `/Users/limyeehan/Documents/Code/side_hustle/japan-tax-helper/src/lib/db/operations.ts` (for test data)
  - Sample receipts from IndexedDB
- **Outputs:**
  - Test results documentation
  - Bug fixes if issues found
  - Updated README or user documentation
- **Log Path:** `docs/orchestration/logs/agent-T8.md`

---

## Execution Waves

### Wave 1: Analysis
- **Parallel:** No (single task)
- **Tasks:** T1
- **Estimated Time:** 15-20 minutes

### Wave 2: Schema Design
- **Parallel:** Yes
- **Tasks:** T2, T3, T6
- **Estimated Time:** 20-25 minutes (concurrent)

### Wave 3: Implementation
- **Parallel:** Yes
- **Tasks:** T4, T5
- **Estimated Time:** 25-30 minutes (concurrent)

### Wave 4: Integration & Testing
- **Parallel:** No (sequential)
- **Tasks:** T7, T8
- **Estimated Time:** 20-25 minutes (sequential)

**Total Estimated Time:** 80-100 minutes

---

## Shared Context

### Key Decisions

*Agents will document key decisions here as they complete tasks*

### Discovered Constraints

*Agents will note any constraints or limitations discovered during implementation*

### Cross-Task Information

*Shared findings, API signatures, file paths, etc. that other tasks need*

---

## Notes

- All agents must read this file before starting work
- Agents must update their individual log files with findings
- The supervisor will merge agent logs back into this context after each wave
- Focus on maintainability: follow existing code patterns in the codebase
- Prioritize Japanese tax compliance: accuracy over features
- Test thoroughly: these exports are used for official tax filing

---

*Last Updated: 2026-01-19*
