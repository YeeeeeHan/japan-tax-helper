'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Settings, FileDown, Trash2, Save, X, CheckCircle2, AlertCircle, Sparkles, Plus, ChevronUp, ChevronDown, Upload, ClipboardCheck, Download, AlertTriangle, ArrowLeft, RotateCw, RotateCcw, ZoomIn, ZoomOut, Move, ArrowUp, ArrowDown, MoveHorizontal, MoveVertical } from 'lucide-react';
import { getReceipts, updateReceipt, deleteReceipt, getReceiptCounts, bulkUpdateReceipts } from '@/lib/db/operations';
import { getImageUrl } from '@/lib/storage/images';
import { exportToExcel } from '@/lib/export/excel';
import type { Receipt, ExpenseCategory } from '@/types/receipt';
import { formatCurrency, formatDate, formatDateForInput, formatTNumber, parseTNumber } from '@/lib/utils/format';
import { EXPENSE_CATEGORIES } from '@/lib/utils/constants';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { useI18n } from '@/lib/i18n/context';

export default function DashboardPage() {
  const router = useRouter();
  const { t, language } = useI18n();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'needsReview' | 'done'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editedData, setEditedData] = useState<Receipt['extractedData'] | null>(null);
  const [counts, setCounts] = useState({ total: 0, uploaded: 0, processing: 0, completed: 0, needsReview: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showExportBlockedModal, setShowExportBlockedModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const receiptRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [imageRotation, setImageRotation] = useState(0);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 });

  // Reset image manipulation when selecting a new receipt
  useEffect(() => {
    setImageRotation(0);
    setImageZoom(1);
    setImagePan({ x: 0, y: 0 });
  }, [selectedReceipt?.id]);

  // Pan step size (in pixels)
  const panStep = 50;

  // Helper to get review reasons for a receipt
  const getReviewReasons = (receipt: Receipt) => {
    const reasons: { key: string; label: string; type: 'error' | 'warning' }[] = [];
    const confidence = receipt.confidence;

    // Overall confidence low
    if (!confidence || confidence.overall < 0.75) {
      reasons.push({ key: 'overall', label: t('review_reason_overall'), type: 'error' });
    }

    // Field-specific checks
    if (confidence?.fields) {
      if (confidence.fields.tNumber < 0.8 || !receipt.extractedData.tNumber) {
        reasons.push({ key: 'tNumber', label: t('review_reason_tnumber'), type: 'warning' });
      }
      if (confidence.fields.totalAmount < 0.8) {
        reasons.push({ key: 'totalAmount', label: t('review_reason_amount'), type: 'warning' });
      }
      if (confidence.fields.category < 0.75) {
        reasons.push({ key: 'category', label: t('review_reason_category'), type: 'warning' });
      }
      if (confidence.fields.issuerName < 0.8) {
        reasons.push({ key: 'issuerName', label: t('review_reason_issuer'), type: 'warning' });
      }
      if (confidence.fields.transactionDate < 0.8) {
        reasons.push({ key: 'transactionDate', label: t('review_reason_date'), type: 'warning' });
      }
    } else if (!receipt.extractedData.tNumber) {
      // If no confidence.fields but T-Number is missing
      reasons.push({ key: 'tNumber', label: t('review_reason_tnumber'), type: 'warning' });
    }

    return reasons;
  };

  // Workflow step calculation
  const getWorkflowStep = () => {
    if (counts.total === 0) return 1; // Upload step
    if (counts.needsReview > 0) return 2; // Review step
    return 3; // Export step
  };
  const workflowStep = getWorkflowStep();
  const canExport = counts.total > 0 && counts.needsReview === 0;

  // Load receipts
  useEffect(() => {
    loadReceipts();
    loadCounts();
  }, [filter, searchQuery]);

  const loadReceipts = async () => {
    const filterMap = {
      'all': 'すべて' as const,
      'needsReview': '要確認' as const,
      'done': '完了' as const,
    };
    const allReceipts = await getReceipts({
      status: filterMap[filter],
      searchQuery: searchQuery || undefined,
    });
    setReceipts(allReceipts);
  };

  const loadCounts = async () => {
    const c = await getReceiptCounts();
    setCounts(c);
  };

  // Load selected receipt image
  useEffect(() => {
    if (selectedReceipt) {
      getImageUrl(selectedReceipt.imageId).then(url => {
        setSelectedImageUrl(url);
      });
      setEditedData(selectedReceipt.extractedData);
    } else {
      setSelectedImageUrl(null);
      setEditedData(null);
    }
  }, [selectedReceipt]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!receipts.length) return;

      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      const currentIndex = selectedReceipt
        ? receipts.findIndex(r => r.id === selectedReceipt.id)
        : -1;

      let nextReceipt: Receipt | null = null;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const nextIndex = currentIndex < receipts.length - 1 ? currentIndex + 1 : 0;
        nextReceipt = receipts[nextIndex];
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : receipts.length - 1;
        nextReceipt = receipts[prevIndex];
      } else if (e.key === 'Escape') {
        setSelectedReceipt(null);
        setIsSelectMode(false);
        setSelectedIds(new Set());
        return;
      }

      if (nextReceipt) {
        setSelectedReceipt(nextReceipt);
        // Scroll the item into view
        const element = receiptRefs.current.get(nextReceipt.id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [receipts, selectedReceipt]);

  const handleSave = async () => {
    if (!selectedReceipt || !editedData) return;

    await updateReceipt(selectedReceipt.id, {
      extractedData: editedData,
      isManuallyReviewed: true,
      needsReview: false,
    });

    await loadReceipts();
    await loadCounts();

    // Move to next receipt after save
    const currentIndex = receipts.findIndex(r => r.id === selectedReceipt.id);
    if (currentIndex < receipts.length - 1) {
      setSelectedReceipt(receipts[currentIndex + 1]);
    } else {
      setSelectedReceipt(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedReceipt) return;

    if (confirm(t('msg_confirm_delete'))) {
      await deleteReceipt(selectedReceipt.id);
      setSelectedReceipt(null);
      await loadReceipts();
      await loadCounts();
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;

    const updates = Array.from(selectedIds).map(id => ({
      id,
      changes: { isManuallyReviewed: true, needsReview: false },
    }));

    await bulkUpdateReceipts(updates);
    setSelectedIds(new Set());
    setIsSelectMode(false);
    await loadReceipts();
    await loadCounts();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmMessage = t('bulk_delete_confirm', { count: selectedIds.size });
    if (!confirm(confirmMessage)) return;

    // Delete all selected receipts
    const idsToDelete = Array.from(selectedIds);
    for (const id of idsToDelete) {
      await deleteReceipt(id);
    }

    // Clear selection and refresh
    if (selectedReceipt && selectedIds.has(selectedReceipt.id)) {
      setSelectedReceipt(null);
    }
    setSelectedIds(new Set());
    setIsSelectMode(false);
    await loadReceipts();
    await loadCounts();
  };

  const handleExport = async () => {
    if (!canExport || isExporting) return;

    try {
      setIsExporting(true);
      // Get ALL receipts (no filters) for export
      const allReceipts = await getReceipts();
      await exportToExcel(allReceipts, language);
    } catch (error) {
      console.error('Export failed:', error);
      alert(t('export_error') || 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const toggleSelectReceipt = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllVisible = () => {
    if (selectedIds.size === receipts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(receipts.map(r => r.id)));
    }
  };

  const getStatusColor = (receipt: Receipt) => {
    if (receipt.needsReview) return 'bg-red-500';
    if (receipt.processingStatus === 'completed') return 'bg-green-500';
    return 'bg-yellow-500';
  };

  const currentIndex = selectedReceipt ? receipts.findIndex(r => r.id === selectedReceipt.id) : -1;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header - Fixed */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/upload')}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                title={t('action_back_to_upload')}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">税</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">TaxHelper Japan</h1>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />

              <button className="hidden sm:block p-2 hover:bg-gray-100 rounded-lg">
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => {
                  if (canExport) {
                    handleExport();
                  } else {
                    setShowExportBlockedModal(true);
                  }
                }}
                disabled={isExporting}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                  canExport && !isExporting
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isExporting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{isExporting ? t('exporting') : t('export')}</span>
              </button>
              <button
                onClick={() => router.push('/upload')}
                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Workflow Progress Bar - Fixed */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Step 1: Upload */}
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                workflowStep >= 1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {workflowStep > 1 ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-4 h-4" />}
              </div>
              <span className={`ml-2 text-sm font-medium hidden sm:inline ${
                workflowStep === 1 ? 'text-primary-600' : workflowStep > 1 ? 'text-green-600' : 'text-gray-500'
              }`}>
                {t('workflow_upload')}
              </span>
            </div>

            {/* Connector */}
            <div className={`flex-1 h-1 mx-2 sm:mx-4 rounded ${
              workflowStep > 1 ? 'bg-green-500' : 'bg-gray-200'
            }`} />

            {/* Step 2: Review */}
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                workflowStep > 2 ? 'bg-green-500 text-white' : workflowStep === 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {workflowStep > 2 ? <CheckCircle2 className="w-5 h-5" /> : <ClipboardCheck className="w-4 h-4" />}
              </div>
              <span className={`ml-2 text-sm font-medium hidden sm:inline ${
                workflowStep === 2 ? 'text-primary-600' : workflowStep > 2 ? 'text-green-600' : 'text-gray-500'
              }`}>
                {t('workflow_review')}
                {workflowStep === 2 && counts.needsReview > 0 && (
                  <span className="ml-1 text-xs text-red-500">({counts.needsReview})</span>
                )}
              </span>
            </div>

            {/* Connector */}
            <div className={`flex-1 h-1 mx-2 sm:mx-4 rounded ${
              workflowStep > 2 ? 'bg-green-500' : 'bg-gray-200'
            }`} />

            {/* Step 3: Export */}
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                workflowStep === 3 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                <Download className="w-4 h-4" />
              </div>
              <span className={`ml-2 text-sm font-medium hidden sm:inline ${
                workflowStep === 3 ? 'text-green-600' : 'text-gray-500'
              }`}>
                {t('workflow_export')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Export Blocked Modal */}
      {showExportBlockedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t('export_blocked_title')}</h3>
            </div>
            <p className="text-gray-600 mb-4">
              {t('export_blocked_message', { count: counts.needsReview })}
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{t('export_blocked_remaining')}</span>
                <span className="font-medium text-red-600">{counts.needsReview} {t('filter_needs_review')}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExportBlockedModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                {t('close')}
              </button>
              <button
                onClick={() => {
                  setShowExportBlockedModal(false);
                  setFilter('needsReview');
                }}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                {t('export_blocked_review_now')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left sidebar - Receipt list */}
        <div ref={listContainerRef} className="w-full lg:w-1/3 xl:w-1/4 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
          {/* Search bar */}
          <div className="px-3 py-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder={t('search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Filter tabs - Compact */}
          <div className="px-3 py-2 border-b border-gray-200 space-y-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t('filter_all')} ({counts.total})
              </button>
              <button
                onClick={() => setFilter('needsReview')}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                  filter === 'needsReview'
                    ? 'bg-red-100 text-red-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                <span>{t('filter_needs_review')} ({counts.needsReview})</span>
              </button>
              <button
                onClick={() => setFilter('done')}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                  filter === 'done'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                <span>{t('filter_done')}</span>
              </button>
            </div>

            {/* Bulk actions bar - Compact */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setIsSelectMode(!isSelectMode);
                    if (isSelectMode) setSelectedIds(new Set());
                  }}
                  className={`text-xs px-2 py-0.5 rounded ${
                    isSelectMode ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {isSelectMode ? t('filter_cancel_select') : t('filter_select')}
                </button>
                {isSelectMode && (
                  <button
                    onClick={selectAllVisible}
                    className="text-xs text-gray-500 hover:text-gray-700 px-1"
                  >
                    {selectedIds.size === receipts.length ? t('filter_deselect_all') : t('filter_select_all')}
                  </button>
                )}
              </div>
              {isSelectMode && selectedIds.size > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleBulkDelete}
                    className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    {t('bulk_delete', { count: selectedIds.size })}
                  </button>
                  <button
                    onClick={handleBulkApprove}
                    className="text-xs px-2 py-0.5 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {t('bulk_approve', { count: selectedIds.size })}
                  </button>
                </div>
              )}
            </div>

            {/* Keyboard hint */}
            <p className="text-xs text-gray-400 hidden lg:block">
              {t('dashboard_keyboard_hint')}
            </p>
          </div>

          {/* Receipt list - Compact */}
          <div className="divide-y divide-gray-100">
            {receipts.map((receipt, index) => (
              <div
                key={receipt.id}
                ref={(el) => {
                  if (el) receiptRefs.current.set(receipt.id, el);
                  else receiptRefs.current.delete(receipt.id);
                }}
                onClick={() => !isSelectMode && setSelectedReceipt(receipt)}
                className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedReceipt?.id === receipt.id ? 'bg-primary-50 border-l-3 border-primary-600' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  {isSelectMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(receipt.id)}
                      onChange={() => toggleSelectReceipt(receipt.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-3.5 h-3.5 text-primary-600 rounded flex-shrink-0"
                    />
                  )}
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusColor(receipt)}`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-900">
                        {formatDate(receipt.extractedData.transactionDate)}
                      </span>
                      <span className="text-xs font-semibold text-gray-900">
                        {formatCurrency(receipt.extractedData.totalAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-gray-600 truncate flex-1 mr-2">{receipt.extractedData.issuerName}</p>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {receipt.extractedData.suggestedCategory}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {receipts.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                {filter === 'needsReview' && counts.total > 0 ? (
                  <>
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p className="font-medium text-green-600">{t('dashboard_all_reviewed')}</p>
                    <p className="text-sm mt-2">{t('dashboard_all_reviewed_hint')}</p>
                  </>
                ) : filter === 'done' && counts.total > 0 ? (
                  <>
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>{t('dashboard_no_done')}</p>
                    <p className="text-sm mt-2">{t('dashboard_no_done_hint')}</p>
                    <button
                      onClick={() => setFilter('needsReview')}
                      className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      {t('dashboard_start_review')}
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>{t('dashboard_no_receipts')}</p>
                    <p className="text-sm mt-2">{t('dashboard_no_receipts_hint')}</p>
                    <button
                      onClick={() => router.push('/upload')}
                      className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      {t('upload')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right panel - Receipt details */}
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          {selectedReceipt && editedData ? (
            <div className="p-4 sm:p-6">
              {/* Navigation header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const prevIndex = currentIndex > 0 ? currentIndex - 1 : receipts.length - 1;
                      setSelectedReceipt(receipts[prevIndex]);
                    }}
                    disabled={receipts.length <= 1}
                    className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                    title={t('action_previous')}
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-gray-600">
                    {currentIndex + 1} / {receipts.length}
                  </span>
                  <button
                    onClick={() => {
                      const nextIndex = currentIndex < receipts.length - 1 ? currentIndex + 1 : 0;
                      setSelectedReceipt(receipts[nextIndex]);
                    }}
                    disabled={receipts.length <= 1}
                    className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                    title={t('action_next')}
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
                {selectedReceipt.needsReview && (
                  <span className="text-sm text-gray-500">{t('status_needs_review')}</span>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Image viewer */}
                <div className="bg-gray-900 rounded-xl overflow-hidden relative" style={{ height: '500px' }}>
                  {selectedImageUrl && (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                      <img
                        src={selectedImageUrl}
                        alt="Receipt"
                        className="max-w-full max-h-full object-contain transition-transform duration-200"
                        style={{
                          transform: `translate(${imagePan.x}px, ${imagePan.y}px) rotate(${imageRotation}deg) scale(${imageZoom})`,
                        }}
                      />
                    </div>
                  )}

                  {/* Pan controls - only show when zoomed in */}
                  {imageZoom > 1 && (
                    <>
                      {/* Up */}
                      <button
                        onClick={() => setImagePan(p => ({ ...p, y: p.y + panStep }))}
                        className="absolute top-3 left-1/2 transform -translate-x-1/2 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                        title={t('image_pan_up')}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      {/* Down */}
                      <button
                        onClick={() => setImagePan(p => ({ ...p, y: p.y - panStep }))}
                        className="absolute bottom-16 left-1/2 transform -translate-x-1/2 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                        title={t('image_pan_down')}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      {/* Left */}
                      <button
                        onClick={() => setImagePan(p => ({ ...p, x: p.x + panStep }))}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                        title={t('image_pan_left')}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      {/* Right */}
                      <button
                        onClick={() => setImagePan(p => ({ ...p, x: p.x - panStep }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                        title={t('image_pan_right')}
                      >
                        <ChevronDown className="w-4 h-4 -rotate-90" />
                      </button>
                    </>
                  )}

                  {/* Image manipulation toolbar */}
                  <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-2">
                    <button
                      onClick={() => setImageRotation(r => r - 90)}
                      className="p-1.5 hover:bg-white/20 rounded-full text-white transition-colors"
                      title={t('image_rotate_left')}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setImageRotation(r => r + 90)}
                      className="p-1.5 hover:bg-white/20 rounded-full text-white transition-colors"
                      title={t('image_rotate_right')}
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-white/30" />
                    <button
                      onClick={() => setImageZoom(z => Math.max(0.5, z - 0.25))}
                      className="p-1.5 hover:bg-white/20 rounded-full text-white transition-colors"
                      title={t('image_zoom_out')}
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-white text-xs min-w-[3rem] text-center">
                      {Math.round(imageZoom * 100)}%
                    </span>
                    <button
                      onClick={() => setImageZoom(z => Math.min(3, z + 0.25))}
                      className="p-1.5 hover:bg-white/20 rounded-full text-white transition-colors"
                      title={t('image_zoom_in')}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    {/* Reset button - show when panned or rotated */}
                    {(imagePan.x !== 0 || imagePan.y !== 0 || imageRotation !== 0) && (
                      <>
                        <div className="w-px h-4 bg-white/30" />
                        <button
                          onClick={() => {
                            setImagePan({ x: 0, y: 0 });
                            setImageRotation(0);
                          }}
                          className="p-1.5 hover:bg-white/20 rounded-full text-white transition-colors"
                          title={t('image_reset')}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Editable form */}
                <div className="space-y-4">
                  {/* Review Reasons Indicators */}
                  {selectedReceipt.needsReview && (() => {
                    const reasons = getReviewReasons(selectedReceipt);
                    return reasons.length > 0 ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-900">{t('review_reasons_title')}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {reasons.map((reason) => (
                            <span
                              key={reason.key}
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                reason.type === 'error'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {reason.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* AI Analysis badge */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        {t('ai_complete')} - {t('ai_confidence', { confidence: ((selectedReceipt.confidence?.overall ?? 0) * 100).toFixed(0) })}
                      </span>
                    </div>
                  </div>

                  {/* Issuer Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('field_issuer_name')}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editedData.issuerName}
                        onChange={(e) => setEditedData({ ...editedData, issuerName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {(selectedReceipt.confidence?.fields?.issuerName ?? 0) >= 0.9 && (
                        <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
                      )}
                    </div>
                  </div>

                  {/* Transaction Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('field_date')}
                    </label>
                    <input
                      type="date"
                      value={formatDateForInput(editedData.transactionDate)}
                      onChange={(e) => setEditedData({ ...editedData, transactionDate: new Date(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {/* T-Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center justify-between">
                      <span>{t('field_tnumber')}</span>
                      {!editedData.tNumber && (
                        <span className="text-xs text-red-600">{t('field_check_required')}</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={editedData.tNumber ? formatTNumber(editedData.tNumber) : ''}
                      onChange={(e) => setEditedData({ ...editedData, tNumber: parseTNumber(e.target.value) })}
                      placeholder="T 1234567890123"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {/* Total Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('field_total_amount')}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">¥</span>
                      <input
                        type="number"
                        value={editedData.totalAmount}
                        onChange={(e) => setEditedData({ ...editedData, totalAmount: parseInt(e.target.value) || 0 })}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right text-lg font-medium"
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('field_category')}
                    </label>
                    <select
                      value={editedData.suggestedCategory}
                      onChange={(e) => setEditedData({ ...editedData, suggestedCategory: e.target.value as ExpenseCategory })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tax Rate display */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('field_tax_rate')}
                    </label>
                    <div className="flex gap-2">
                      {editedData.taxBreakdown.map((tb, idx) => (
                        <span key={idx} className="px-3 py-1 bg-gray-100 rounded text-sm">
                          {tb.taxRate}%: ¥{tb.taxAmount.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{t('delete')}</span>
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t('action_approve')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 p-8">
              <div className="text-center">
                <FileDown className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p>{t('dashboard_select_receipt')}</p>
                <p className="text-sm mt-2">
                  {t('dashboard_select_hint')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
