# Quick Start Guide - Japanese Tax Helper

## 🚀 Get Running in 3 Minutes

### Step 1: Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy your API key

### Step 2: Add API Key

Open `.env.local` and add your key:

```bash
GEMINI_API_KEY=your_key_here
```

### Step 3: Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## ✅ You're Ready!

The app will:
1. Auto-redirect to `/upload`
2. Let you drag-and-drop receipt images
3. Extract data using AI
4. Show results in the dashboard

## 📝 Quick Test

1. **Upload**: Drop receipt images from `sample_receipts/` folder
2. **Process**: Click "一括登録する" (Batch Register)
3. **View**: Go to dashboard to see extracted data
4. **Edit**: Click any receipt to review/edit
5. **Export**: Click "エクスポート" to download Excel

## 🎯 Key Features

- **Upload Page** (`/upload`): Batch upload with progress tracking
- **Dashboard** (`/dashboard`): Review and edit receipts
- **Export**: Multi-sheet Excel with images

## 📊 What Gets Extracted

- ✅ Issuer Name (発行者名)
- ✅ T-Number (登録番号)
- ✅ Date (取引年月日)
- ✅ Amount (金額)
- ✅ Tax Breakdown (消費税)
- ✅ Category (勘定科目)

## 🔧 Troubleshooting

**API Error?**
- Check your Gemini API key in `.env.local`
- Verify the key is valid at Google AI Studio

**Build Failed?**
- Run `npm install` again
- Check Node.js version: `node -v` (should be 18+)

**Nothing Uploaded?**
- Check browser console for errors
- Ensure files are JPG, PNG, or PDF
- Max file size: 10MB

## 💡 Tips

- Process 5-10 receipts at a time for best performance
- Review flagged receipts (red dots) carefully
- Export regularly to back up your data
- All data is stored locally in your browser

## 🎨 UI Overview

Based on the mockups you provided:

**Upload Page**:
- Status cards showing upload/processing/completed counts
- Large drag-and-drop zone
- File list with progress bars

**Dashboard**:
- Left: Receipt list with filtering
- Right: Detail panel with image + editable form
- AI confidence indicators
- Save & approve buttons

## 📱 Next Steps

1. Test with real receipts
2. Customize categories if needed
3. Export and review Excel output
4. Integrate into your workflow

## 🆘 Need Help?

- Check `README.md` for full documentation
- Review the implementation plan in `.claude/plans/`
- File an issue if something doesn't work

Happy tax filing! 🎉
