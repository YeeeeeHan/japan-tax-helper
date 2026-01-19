// Translation strings for Japanese and English

export type Language = 'ja' | 'en';

export const translations = {
  ja: {
    // Common
    app_name: 'TaxHelper Japan',
    loading: '読み込み中...',
    save: '保存',
    cancel: 'キャンセル',
    delete: '削除',
    export: 'エクスポート',
    search: '検索...',
    close: '閉じる',
    back: '戻る',
    dashboard: 'ダッシュボード',
    upload: 'アップロード',
    settings: '設定',
    zoom_in: '拡大',
    zoom_out: '縮小',
    confidence: '信頼度',
    key_esc: 'ESC',
    receipt_image: '領収書画像',

    // Upload page
    upload_title: '領収書一括アップロード',
    upload_subtitle: '複数の領収書を一度に登録します。解析結果を確認してから登録ボタンを押してください。',
    upload_instructions_title: '良い写真を撮るためのガイドライン',
    upload_instructions_description: 'AI が正確にデータを抽出するために、以下のガイドラインに従って領収書を撮影してください。',
    upload_card_uploaded: 'アップロード済み',
    upload_card_processing: '処理中',
    upload_card_completed: '完了（確認待ち）',
    upload_dropzone_title: 'ここに領収書をドラッグ&ドロップ',
    upload_dropzone_subtitle: 'またはファイルを選択 (JPG, PNG, PDF 最大 10MB)',
    upload_file_select: 'ファイルを選択',
    upload_batch_register: '一括登録する',
    upload_files: 'アップロードファイル',
    upload_completed_status: '完了',
    upload_failed_status: '失敗',
    upload_processing_status: '処理中...',
    upload_go_to_dashboard: 'ダッシュボードで確認',
    upload_clear_all: 'すべてクリア',
    upload_files_count: 'ファイル数:',
    upload_total_size: '合計サイズ:',
    upload_done: '完了',
    upload_failed: '失敗',
    upload_process_files: '{count}件を処理',
    upload_confirm_title: '処理を開始しますか？',
    upload_confirm_message: '{count}件のファイル（{size}）をAIで処理します。処理には数分かかる場合があります。',
    upload_start_processing: '処理を開始',
    upload_retry: '再試行',
    upload_click_to_retry: 'クリックして再試行',
    upload_camera_button: 'カメラで撮影',
    upload_review_first: '次の領収書を確認',

    // Dashboard
    dashboard_title: '領収書詳細',
    dashboard_receipts_count: '{count}件の領収書',
    dashboard_needs_review: '{count}件 要確認',
    dashboard_no_receipts: '領収書がありません',
    dashboard_no_receipts_hint: 'アップロードページから領収書を追加してください',
    dashboard_select_receipt: '領収書を選択してください',
    dashboard_select_hint: '左のリストから領収書をクリック、または↑↓キーで移動',
    dashboard_keyboard_hint: '↑↓キーで移動',
    dashboard_all_reviewed: 'すべて確認済み',
    dashboard_all_reviewed_hint: 'エクスポートの準備ができました',
    dashboard_no_done: '確認済みの領収書がありません',
    dashboard_no_done_hint: '要確認の領収書を確認してください',
    dashboard_start_review: '確認を開始',

    // Workflow
    workflow_upload: 'アップロード',
    workflow_review: '確認',
    workflow_export: 'エクスポート',
    workflow_all_complete_title: 'すべて確認完了！',
    workflow_all_complete_message: 'すべての領収書の確認が完了しました。Excelファイルをエクスポートできます。',
    workflow_export_now: '今すぐエクスポート',
    workflow_review_more: '続けて確認',

    // Export blocked
    export_blocked_title: 'エクスポートできません',
    export_blocked_message: '{count}件の領収書が未確認です。すべての領収書を確認してからエクスポートしてください。',
    export_blocked_remaining: '残り確認数',
    export_blocked_review_now: '今すぐ確認',

    // Filters
    filter_all: 'すべて',
    filter_needs_review: '要確認',
    filter_done: '完了',
    filter_select: '選択',
    filter_cancel_select: '選択解除',
    filter_select_all: '全選択',
    filter_deselect_all: '全解除',

    // Bulk actions
    bulk_approve: '{count}件を承認',
    bulk_delete: '{count}件を削除',
    bulk_delete_confirm: '{count}件の領収書を削除してもよろしいですか？この操作は元に戻せません。',

    // Receipt fields
    field_issuer_name: '発行者名',
    field_date: '取引年月日',
    field_tnumber: '登録番号 (T-Number)',
    field_total_amount: '合計金額',
    field_category: '勘定科目',
    field_tax_rate: '適用税率',
    field_verify: '確認',
    field_missing_value: '値がありません',
    field_check_required: '要確認',

    // Status
    status_high_confidence: '高信頼度',
    status_needs_review: '要確認',
    status_completed: '完了',

    // Review reasons
    review_reasons_title: '確認が必要な項目',
    review_reason_overall: '全体的な信頼度が低い',
    review_reason_tnumber: 'T番号の確認',
    review_reason_amount: '金額の確認',
    review_reason_category: '勘定科目の確認',
    review_reason_issuer: '発行者名の確認',
    review_reason_date: '取引日の確認',

    // Validation warnings (from API)
    warning_low_confidence: '全体的な信頼度が低い',
    warning_tnumber_not_found: 'T番号が見つかりません',
    warning_tnumber_low_confidence: 'T番号の信頼度が低い',
    warning_tnumber_missing_compliance: 'T番号がありません。適格請求書の要件を満たさない可能性があります',
    warning_amount_low_confidence: '金額の信頼度が低い',
    warning_total_low_confidence: '合計金額の信頼度が低い',
    warning_tnumber_missing: 'T番号がありません。適格請求書の要件を満たさない可能性があります',
    warning_tax_calculation_mismatch: '税額計算の不一致: 期待値 {expected}円、実際 {actual}円',
    warning_total_amount_mismatch: '合計金額の不一致: 期待値 {expected}円、実際 {actual}円',

    // Actions
    action_save_next: '保存して次へ',
    action_save_approve: '保存して完了',
    action_approve: '承認',
    action_cancel: 'キャンセル',
    action_delete: '削除',
    action_export: 'エクスポート',
    action_previous: '前へ',
    action_next: '次へ',
    action_back_to_upload: 'アップロードに戻る',

    // Image manipulation
    image_rotate_left: '左に回転',
    image_rotate_right: '右に回転',
    image_zoom_in: '拡大',
    image_zoom_out: '縮小',
    image_pan_up: '上へ移動',
    image_pan_down: '下へ移動',
    image_pan_left: '左へ移動',
    image_pan_right: '右へ移動',
    image_reset: 'リセット',
    image_hover_to_zoom: 'ホバーで拡大',
    image_fullscreen: '全画面表示',
    image_exit_fullscreen: '全画面終了',
    image_pinch_to_zoom: 'ピンチで拡大',
    image_double_tap_zoom: 'ダブルタップで拡大',
    image_drag_to_pan: 'ドラッグで移動',
    image_scroll_to_zoom: 'スクロールで拡大',
    image_zoom_mode_inner: '内部ズーム',
    image_zoom_mode_lens: 'レンズ',
    image_zoom_mode_panel: 'パネル',
    image_lens_size: 'レンズサイズ',
    image_loading_hires: '高解像度読み込み中...',
    image_tap_to_expand: 'タップで拡大',
    image_expand: '拡大',
    image_collapse: '縮小',

    // AI Analysis
    ai_complete: 'AI解析完了',
    ai_confidence: '信頼度 {confidence}%',

    // Messages
    msg_no_tnumber: 'この領収書には登録番号がありません',
    msg_verify_error: 'NTAデータベースで自動確認できませんでした。',
    msg_confirm_delete: 'この領収書を削除してもよろしいですか？',

    // Export
    exporting: 'エクスポート中...',
    export_error: 'エクスポートに失敗しました。もう一度お試しください。',
    export_excel: 'Excel形式',
    export_csv: 'CSV形式 (e-Tax対応)',
    export_csv_summary: 'CSV集計 (e-Tax対応)',

    // Expense Categories (勘定科目) - NTA Official Categories
    category_租税公課: '租税公課',
    category_水道光熱費: '水道光熱費',
    category_旅費交通費: '旅費交通費',
    category_通信費: '通信費',
    category_修繕費: '修繕費',
    category_消耗品費: '消耗品費',
    category_雑費: '雑費',
    category_給料賃金: '給料賃金',
    category_外注工賃: '外注工賃',
    category_減価償却費: '減価償却費',
    category_貸倒金: '貸倒金',
    category_地代家賃: '地代家賃',
    category_利子割引料: '利子割引料',
    category_交際費: '交際費',
    category_接待交際費: '接待交際費',
    category_広告宣伝費: '広告宣伝費',
    category_福利厚生費: '福利厚生費',
    category_未分類: '未分類',

    // Depreciation threshold warnings
    warning_depreciation_threshold_title: '減価償却の確認',
    warning_depreciation_required: '10万円以上のため減価償却が必要な可能性があります。青色申告者は少額減価償却資産の特例で即時経費化可能な場合があります。',
    warning_depreciation_note: '減価償却の確認が必要',

    // Excel export - Depreciation sheet
    sheet_depreciation: '減価償却対象',
    depreciation_method: '償却方法の提案',
    depreciation_note: '備考',
    depreciation_header_note: '※青色申告者は少額減価償却資産の特例が適用可能な場合があります',
    depreciation_immediate: '即時経費化可能（特例）',
    depreciation_lumpsum: '一括償却資産（3年均等）',
    depreciation_standard: '通常減価償却（耐用年数）',
    depreciation_register_required: '要：固定資産台帳への登録',
  },

  en: {
    // Common
    app_name: 'TaxHelper Japan',
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    export: 'Export',
    search: 'Search...',
    close: 'Close',
    back: 'Back',
    dashboard: 'Dashboard',
    upload: 'Upload',
    settings: 'Settings',
    zoom_in: 'Zoom in',
    zoom_out: 'Zoom out',
    confidence: 'confidence',
    key_esc: 'ESC',
    receipt_image: 'Receipt image',

    // Upload page
    upload_title: 'Batch Upload Receipts',
    upload_subtitle: 'Upload multiple receipts at once. Review the extracted data before confirming.',
    upload_instructions_title: 'Photo Guidelines for Best Results',
    upload_instructions_description: 'For accurate AI data extraction, please follow these guidelines when photographing receipts.',
    upload_card_uploaded: 'Uploaded',
    upload_card_processing: 'Processing',
    upload_card_completed: 'Completed (Awaiting Review)',
    upload_dropzone_title: 'Drag & Drop Receipts Here',
    upload_dropzone_subtitle: 'Or select files (JPG, PNG, PDF - Max 10MB)',
    upload_file_select: 'Select Files',
    upload_batch_register: 'Register All',
    upload_files: 'Uploaded Files',
    upload_completed_status: 'Completed',
    upload_failed_status: 'Failed',
    upload_processing_status: 'Processing...',
    upload_go_to_dashboard: 'View Dashboard',
    upload_clear_all: 'Clear All',
    upload_files_count: 'Files:',
    upload_total_size: 'Total size:',
    upload_done: 'done',
    upload_failed: 'failed',
    upload_process_files: 'Process {count} files',
    upload_confirm_title: 'Start Processing?',
    upload_confirm_message: '{count} files ({size}) will be processed by AI. This may take a few minutes.',
    upload_start_processing: 'Start Processing',
    upload_retry: 'Retry',
    upload_click_to_retry: 'Click to retry',
    upload_camera_button: 'Take Photo',
    upload_review_first: 'Review Next Receipt',

    // Dashboard
    dashboard_title: 'Receipt Details',
    dashboard_receipts_count: '{count} Receipts',
    dashboard_needs_review: '{count} Need Review',
    dashboard_no_receipts: 'No receipts yet',
    dashboard_no_receipts_hint: 'Upload receipts from the upload page',
    dashboard_select_receipt: 'Select a receipt',
    dashboard_select_hint: 'Click from the list or use arrow keys',
    dashboard_keyboard_hint: 'Use arrow keys to navigate',
    dashboard_all_reviewed: 'All reviewed',
    dashboard_all_reviewed_hint: 'Ready to export',
    dashboard_no_done: 'No reviewed receipts yet',
    dashboard_no_done_hint: 'Review pending receipts first',
    dashboard_start_review: 'Start reviewing',

    // Workflow
    workflow_upload: 'Upload',
    workflow_review: 'Review',
    workflow_export: 'Export',
    workflow_all_complete_title: 'All Done!',
    workflow_all_complete_message: 'All receipts have been reviewed. You can now export to Excel.',
    workflow_export_now: 'Export Now',
    workflow_review_more: 'Review More',

    // Export blocked
    export_blocked_title: 'Cannot Export Yet',
    export_blocked_message: '{count} receipts need review. Please review all receipts before exporting.',
    export_blocked_remaining: 'Remaining',
    export_blocked_review_now: 'Review Now',

    // Filters
    filter_all: 'All',
    filter_needs_review: 'Review',
    filter_done: 'Done',
    filter_select: 'Select',
    filter_cancel_select: 'Cancel',
    filter_select_all: 'Select All',
    filter_deselect_all: 'Deselect All',

    // Bulk actions
    bulk_approve: 'Approve {count}',
    bulk_delete: 'Delete {count}',
    bulk_delete_confirm: 'Delete {count} receipts? This cannot be undone.',

    // Receipt fields
    field_issuer_name: 'Issuer Name',
    field_date: 'Transaction Date',
    field_tnumber: 'T-Number (Registration)',
    field_total_amount: 'Total Amount',
    field_category: 'Expense Category',
    field_tax_rate: 'Tax Rate',
    field_verify: 'Verify',
    field_missing_value: 'Missing value',
    field_check_required: 'Required',

    // Status
    status_high_confidence: 'HIGH CONFIDENCE',
    status_needs_review: 'Needs Review',
    status_completed: 'Completed',

    // Review reasons
    review_reasons_title: 'Items needing attention',
    review_reason_overall: 'Low overall confidence',
    review_reason_tnumber: 'T-Number needs review',
    review_reason_amount: 'Amount needs review',
    review_reason_category: 'Category needs review',
    review_reason_issuer: 'Issuer name needs review',
    review_reason_date: 'Date needs review',

    // Validation warnings (from API)
    warning_low_confidence: 'Overall confidence is low',
    warning_tnumber_not_found: 'T-Number not found on receipt',
    warning_tnumber_low_confidence: 'T-Number has low confidence',
    warning_tnumber_missing_compliance: 'T-Number is missing. May not comply with 適格請求書 requirements',
    warning_amount_low_confidence: 'Amount has low confidence',
    warning_total_low_confidence: 'Total amount has low confidence',
    warning_tnumber_missing: 'T-Number is missing. May not comply with 適格請求書 requirements',
    warning_tax_calculation_mismatch: 'Tax calculation mismatch: expected ¥{expected}, got ¥{actual}',
    warning_total_amount_mismatch: 'Total amount mismatch: expected ¥{expected}, got ¥{actual}',

    // Actions
    action_save_next: 'Save & Next',
    action_save_approve: 'Save & Approve',
    action_approve: 'Approve',
    action_cancel: 'Cancel',
    action_delete: 'Delete',
    action_export: 'Export',
    action_previous: 'Previous',
    action_next: 'Next',
    action_back_to_upload: 'Back to Upload',

    // Image manipulation
    image_rotate_left: 'Rotate left',
    image_rotate_right: 'Rotate right',
    image_zoom_in: 'Zoom in',
    image_zoom_out: 'Zoom out',
    image_pan_up: 'Pan up',
    image_pan_down: 'Pan down',
    image_pan_left: 'Pan left',
    image_pan_right: 'Pan right',
    image_reset: 'Reset',
    image_hover_to_zoom: 'Hover to zoom',
    image_fullscreen: 'Fullscreen',
    image_exit_fullscreen: 'Exit fullscreen',
    image_pinch_to_zoom: 'Pinch to zoom',
    image_double_tap_zoom: 'Double-tap to zoom',
    image_drag_to_pan: 'Drag to pan',
    image_scroll_to_zoom: 'Scroll to zoom',
    image_zoom_mode_inner: 'Inner',
    image_zoom_mode_lens: 'Lens',
    image_zoom_mode_panel: 'Panel',
    image_lens_size: 'Lens size',
    image_loading_hires: 'Loading high-res...',
    image_tap_to_expand: 'Tap to expand',
    image_expand: 'Expand',
    image_collapse: 'Collapse',

    // AI Analysis
    ai_complete: 'AI Analysis Complete',
    ai_confidence: '{confidence}% confidence',

    // Messages
    msg_no_tnumber: 'No T-Number found on this receipt',
    msg_verify_error: 'Could not verify automatically against NTA database.',
    msg_confirm_delete: 'Delete this receipt?',

    // Export
    exporting: 'Exporting...',
    export_error: 'Export failed. Please try again.',
    export_excel: 'Excel Format',
    export_csv: 'CSV Format (e-Tax)',
    export_csv_summary: 'CSV Summary (e-Tax)',

    // Expense Categories (勘定科目) - NTA Official Categories (Japanese + English)
    category_租税公課: '租税公課 (Taxes & Public Charges)',
    category_水道光熱費: '水道光熱費 (Utilities)',
    category_旅費交通費: '旅費交通費 (Travel & Transportation)',
    category_通信費: '通信費 (Communication)',
    category_修繕費: '修繕費 (Repairs)',
    category_消耗品費: '消耗品費 (Consumables)',
    category_雑費: '雑費 (Miscellaneous)',
    category_給料賃金: '給料賃金 (Salaries & Wages)',
    category_外注工賃: '外注工賃 (Outsourcing Costs)',
    category_減価償却費: '減価償却費 (Depreciation)',
    category_貸倒金: '貸倒金 (Bad Debts)',
    category_地代家賃: '地代家賃 (Rent)',
    category_利子割引料: '利子割引料 (Interest & Discounts)',
    category_交際費: '交際費 (Entertainment)',
    category_接待交際費: '接待交際費 (Entertainment Expenses)',
    category_広告宣伝費: '広告宣伝費 (Advertising)',
    category_福利厚生費: '福利厚生費 (Employee Welfare)',
    category_未分類: '未分類 (Uncategorized)',

    // Depreciation threshold warnings
    warning_depreciation_threshold_title: 'Depreciation Review Required',
    warning_depreciation_required: 'Amount ≥¥100,000: May require depreciation treatment. Blue form (青色申告) filers may use immediate expensing under 少額減価償却資産の特例.',
    warning_depreciation_note: 'Depreciation review required',

    // Excel export - Depreciation sheet
    sheet_depreciation: 'Depreciation Assets',
    depreciation_method: 'Suggested Method',
    depreciation_note: 'Notes',
    depreciation_header_note: '※Blue form filers may apply 少額減価償却資産の特例 (immediate expensing)',
    depreciation_immediate: 'Immediate expensing (special rule)',
    depreciation_lumpsum: 'Lump-sum depreciation (3 years)',
    depreciation_standard: 'Standard depreciation (useful life)',
    depreciation_register_required: 'Required: Register in fixed asset ledger',
  },
};

export type TranslationKey = keyof typeof translations.ja;

export function t(key: TranslationKey, lang: Language = 'ja', params?: Record<string, string | number>): string {
  let text = translations[lang][key] || translations.ja[key];

  // Replace parameters
  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      text = text.replace(`{${param}}`, String(value));
    });
  }

  return text;
}
