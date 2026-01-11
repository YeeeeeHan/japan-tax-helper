# Japanese Tax Helper - 領収書管理システム

AI-powered receipt management system for Japanese self-employed professionals (個人事業主).

## Features

- 📸 **Batch Receipt Upload** - Upload multiple receipts at once via drag-and-drop
- 🤖 **AI-Powered OCR** - Automatic data extraction using Google Gemini Vision API
- ✅ **Tax Compliance** - Validates 適格請求書 (Qualified Invoice) requirements with T-Number checking
- 📊 **Smart Categorization** - Auto-categorizes expenses into standard Japanese tax categories
- ✏️ **Interactive Dashboard** - Review and edit extracted data with confidence indicators
- 📥 **Excel Export** - Generate comprehensive Excel reports with multiple sheets and embedded images
- 🔒 **Privacy First** - All data stored locally in browser (IndexedDB), never sent to servers

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **UI**: Tailwind CSS, Framer Motion, Lucide Icons
- **Database**: Dexie.js (IndexedDB wrapper)
- **AI**: Google Gemini Vision API
- **Export**: ExcelJS

## Getting Started

### Prerequisites

- Node.js 18+ (Note: Currently using 18.18.0, may need upgrade to 20+ for latest Next.js)
- Google Gemini API Key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Install dependencies**

```bash
npm install
```

2. **Set up environment variables**

Create a `.env.local` file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Gemini API key:

```
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. **Run the development server**

```bash
npm run dev
```

4. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Upload Receipts

- Go to the upload page
- Drag and drop receipt images (JPG, PNG, HEIC, PDF)
- Click "一括登録する" to process all receipts
- Wait for AI to extract data

### 2. Review & Edit

- Navigate to the dashboard
- Click on any receipt to view details
- Review AI-extracted data
- Edit any fields if needed
- Save to mark as reviewed

### 3. Export to Excel

- Click "エクスポート" button in the dashboard header
- Download Excel file with 4 sheets

## Japanese Tax Compliance

This app validates receipts according to Japan's 適格請求書等保存方式 (Qualified Invoice System).

### Required Fields (as of 2026)

1. **発行事業者名** (Issuer Name)
2. **登録番号** (T-Number): T + 13 digits
3. **取引年月日** (Transaction Date)
4. **取引内容** (Description)
5. **税率ごとの金額** (Amount by Tax Rate): 8% or 10%
6. **消費税額** (Tax Amount by Rate)

---

Made with ❤️ for Japanese freelancers and small business owners