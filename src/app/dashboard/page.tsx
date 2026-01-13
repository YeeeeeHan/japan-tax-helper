'use client';

import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import {
  bulkUpdateReceipts,
  deleteReceipt,
  getReceiptCounts,
  getReceipts,
  updateReceipt,
} from '@/lib/db/operations';
import { exportToExcel } from '@/lib/export/excel';
import { useI18n } from '@/lib/i18n/context';
import type { TranslationKey } from '@/lib/i18n/translations';
import { getImageUrl } from '@/lib/storage/images';
import { EXPENSE_CATEGORIES } from '@/lib/utils/constants';
import {
  formatCurrency,
  formatDate,
  formatDateForInput,
  formatTNumber,
  parseTNumber,
} from '@/lib/utils/format';
import {
  shouldSuggestEquipmentCategory,
  validateReceiptData,
  type ValidationWarning,
} from '@/lib/validation/receipt';
import type { ExpenseCategory, Receipt } from '@/types/receipt';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Download,
  FileDown,
  Maximize2,
  RotateCcw,
  RotateCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const { t, language } = useI18n();
  const [isLoading, setIsLoading] = useState(true);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'needsReview' | 'done'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editedData, setEditedData] = useState<Receipt['extractedData'] | null>(
    null
  );
  const [counts, setCounts] = useState({
    total: 0,
    uploaded: 0,
    processing: 0,
    completed: 0,
    needsReview: 0,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showExportBlockedModal, setShowExportBlockedModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const receiptRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Store rotation per receipt ID (persists across receipt selection)
  const [rotationMap, setRotationMap] = useState<Map<string, number>>(
    new Map()
  );

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Magnifier state
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPosition, setMagnifierPosition] = useState({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });

  // Track previous receipt rotation to disable transition when switching receipts
  const prevReceiptRotationRef = useRef<{
    id: string;
    rotation: number;
  } | null>(null);

  // Get current rotation for selected receipt
  const imageRotation = selectedReceipt
    ? rotationMap.get(selectedReceipt.id) ?? 0
    : 0;

  // Check if we should apply transition (only if staying on same receipt)
  const shouldTransition = selectedReceipt
    ? prevReceiptRotationRef.current?.id === selectedReceipt.id
    : true;

  // Update rotation for current receipt
  const setImageRotation = (updater: number | ((prev: number) => number)) => {
    if (!selectedReceipt) return;
    setRotationMap((prev) => {
      const newMap = new Map(prev);
      const currentRotation = prev.get(selectedReceipt.id) ?? 0;
      const newRotation =
        typeof updater === 'function' ? updater(currentRotation) : updater;
      newMap.set(selectedReceipt.id, newRotation);
      return newMap;
    });
  };

  // Update previous rotation reference when receipt or rotation changes
  useEffect(() => {
    if (selectedReceipt) {
      prevReceiptRotationRef.current = {
        id: selectedReceipt.id,
        rotation: imageRotation,
      };
    }
  }, [selectedReceipt, imageRotation]);

  // Close fullscreen on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Helper to get field confidence status for styling
  const getFieldConfidenceStatus = (
    receipt: Receipt,
    fieldName: string
  ): 'ok' | 'attention' => {
    const confidence =
      receipt.confidence?.fields?.[
        fieldName as keyof typeof receipt.confidence.fields
      ];

    // T-Number needs attention if missing OR has invalid format (regardless of confidence)
    if (fieldName === 'tNumber') {
      const tNumber = receipt.extractedData.tNumber;
      if (!tNumber || !/^T\d{13}$/.test(tNumber)) {
        return 'attention';
      }
    }

    if (confidence === undefined) return 'attention';
    if (confidence >= 0.9) return 'ok';
    return 'attention';
  };

  // Get input field styling based on confidence
  const getFieldInputClassName = (
    receipt: Receipt,
    fieldName: string,
    baseClass: string = ''
  ) => {
    const status = getFieldConfidenceStatus(receipt, fieldName);
    const statusStyles = {
      ok: 'border-gray-300 focus:ring-primary-500',
      attention: 'border-amber-400 bg-amber-50 focus:ring-amber-500',
    };
    return `${baseClass} ${statusStyles[status]}`;
  };

  // Get confidence indicator icon for a field
  const FieldConfidenceIndicator = ({
    receipt,
    fieldName,
  }: {
    receipt: Receipt;
    fieldName: string;
  }) => {
    const status = getFieldConfidenceStatus(receipt, fieldName);
    const confidence =
      receipt.confidence?.fields?.[
        fieldName as keyof typeof receipt.confidence.fields
      ];
    const confidencePercent =
      confidence !== undefined ? Math.round(confidence * 100) : null;

    if (status === 'ok') {
      return (
        <span title={`${confidencePercent}% confidence`}>
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        </span>
      );
    }
    return (
      <span
        title={
          confidencePercent !== null
            ? `${confidencePercent}% confidence - needs review`
            : 'Missing value'
        }
      >
        <AlertCircle className="w-4 h-4 text-amber-600" />
      </span>
    );
  };

  // Helper to get review reason for a specific field
  const getFieldReviewReason = (
    receipt: Receipt,
    fieldName: string
  ): string | null => {
    const confidence =
      receipt.confidence?.fields?.[
        fieldName as keyof typeof receipt.confidence.fields
      ];

    // Check T-Number for missing or invalid format
    if (fieldName === 'tNumber') {
      const tNumber = receipt.extractedData.tNumber;
      if (!tNumber) {
        return t('warning_tnumber_not_found');
      }
      if (!/^T\d{13}$/.test(tNumber)) {
        return t('review_reason_tnumber');
      }
    }

    const needsAttention = (() => {
      if (confidence === undefined) return true;
      return confidence < 0.9;
    })();

    if (!needsAttention) return null;

    switch (fieldName) {
      case 'tNumber':
        return t('review_reason_tnumber');
      case 'totalAmount':
        return t('review_reason_amount');
      case 'category':
        return t('review_reason_category');
      case 'issuerName':
        return t('review_reason_issuer');
      case 'transactionDate':
        return t('review_reason_date');
      default:
        return null;
    }
  };

  // Workflow step calculation
  const getWorkflowStep = () => {
    if (counts.total === 0) return 1;
    if (counts.needsReview > 0) return 2;
    return 3;
  };
  const workflowStep = getWorkflowStep();
  const canExport = counts.total > 0 && counts.needsReview === 0;

  // Load receipts
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        await Promise.all([loadReceipts(), loadCounts()]);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [filter, searchQuery]);

  const loadReceipts = async () => {
    const filterMap = {
      all: 'すべて' as const,
      needsReview: '要確認' as const,
      done: '完了' as const,
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
      getImageUrl(selectedReceipt.imageId).then((url) => {
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
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const currentIndex = selectedReceipt
        ? receipts.findIndex((r) => r.id === selectedReceipt.id)
        : -1;

      let nextReceipt: Receipt | null = null;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const nextIndex =
          currentIndex < receipts.length - 1 ? currentIndex + 1 : 0;
        nextReceipt = receipts[nextIndex];
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const prevIndex =
          currentIndex > 0 ? currentIndex - 1 : receipts.length - 1;
        nextReceipt = receipts[prevIndex];
      } else if (e.key === 'Escape') {
        setSelectedReceipt(null);
        setIsSelectMode(false);
        setSelectedIds(new Set());
        return;
      }

      if (nextReceipt) {
        setSelectedReceipt(nextReceipt);
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

    const currentIndex = receipts.findIndex((r) => r.id === selectedReceipt.id);
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

    const updates = Array.from(selectedIds).map((id) => ({
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

    const confirmMessage = t('bulk_delete_confirm', {
      count: selectedIds.size,
    });
    if (!confirm(confirmMessage)) return;

    const idsToDelete = Array.from(selectedIds);
    for (const id of idsToDelete) {
      await deleteReceipt(id);
    }

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
    setSelectedIds((prev) => {
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
      setSelectedIds(new Set(receipts.map((r) => r.id)));
    }
  };

  const getStatusColor = (receipt: Receipt) => {
    if (receipt.needsReview) return 'bg-red-500';
    if (receipt.processingStatus === 'completed') return 'bg-green-500';
    return 'bg-yellow-500';
  };

  const currentIndex = selectedReceipt
    ? receipts.findIndex((r) => r.id === selectedReceipt.id)
    : -1;

  // Show loading screen while initializing
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center mb-4">
          <span className="text-white font-bold text-xl">税</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Japanese Tax Helper
        </h1>
        <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
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
              <h1 className="text-xl font-bold text-gray-900">
                TaxHelper Japan
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
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
                <span className="hidden sm:inline">
                  {isExporting ? t('exporting') : t('export')}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Workflow Progress Bar */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  workflowStep >= 1
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {workflowStep > 1 ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
              </div>
              <span
                className={`ml-2 text-sm font-medium hidden sm:inline ${
                  workflowStep === 1
                    ? 'text-primary-600'
                    : workflowStep > 1
                    ? 'text-green-600'
                    : 'text-gray-500'
                }`}
              >
                {t('workflow_upload')}
              </span>
            </div>
            <div
              className={`flex-1 h-1 mx-2 sm:mx-4 rounded ${
                workflowStep > 1 ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  workflowStep > 2
                    ? 'bg-green-500 text-white'
                    : workflowStep === 2
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {workflowStep > 2 ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <ClipboardCheck className="w-4 h-4" />
                )}
              </div>
              <span
                className={`ml-2 text-sm font-medium hidden sm:inline ${
                  workflowStep === 2
                    ? 'text-primary-600'
                    : workflowStep > 2
                    ? 'text-green-600'
                    : 'text-gray-500'
                }`}
              >
                {t('workflow_review')}
                {workflowStep === 2 && counts.needsReview > 0 && (
                  <span className="ml-1 text-xs text-red-500">
                    ({counts.needsReview})
                  </span>
                )}
              </span>
            </div>
            <div
              className={`flex-1 h-1 mx-2 sm:mx-4 rounded ${
                workflowStep > 2 ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  workflowStep === 3
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                <Download className="w-4 h-4" />
              </div>
              <span
                className={`ml-2 text-sm font-medium hidden sm:inline ${
                  workflowStep === 3 ? 'text-green-600' : 'text-gray-500'
                }`}
              >
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
              <h3 className="text-lg font-bold text-gray-900">
                {t('export_blocked_title')}
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              {t('export_blocked_message', { count: counts.needsReview })}
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {t('export_blocked_remaining')}
                </span>
                <span className="font-medium text-red-600">
                  {counts.needsReview} {t('filter_needs_review')}
                </span>
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

      {/* Fullscreen Image Modal */}
      {isFullscreen && selectedImageUrl && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={() => setIsFullscreen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
            title={t('image_exit_fullscreen')}
          >
            <X className="w-6 h-6" />
          </button>

          {/* Receipt info */}
          {selectedReceipt && (
            <div className="absolute top-4 left-4 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-lg text-white text-sm">
              <div className="font-medium">
                {selectedReceipt.extractedData.issuerName}
              </div>
              <div className="text-white/70 text-xs">
                {formatDate(selectedReceipt.extractedData.transactionDate)}
              </div>
            </div>
          )}

          {/* Image */}
          <div
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const img = e.currentTarget.querySelector('img');
              if (img) {
                const imgRect = img.getBoundingClientRect();
                const x = e.clientX - imgRect.left;
                const y = e.clientY - imgRect.top;

                // Only show magnifier if cursor is within the image bounds
                if (
                  x >= 0 &&
                  x <= imgRect.width &&
                  y >= 0 &&
                  y <= imgRect.height
                ) {
                  setShowMagnifier(true);
                  setMagnifierPosition({ x: e.clientX, y: e.clientY });

                  // Calculate position in original (unrotated) image coordinates
                  // based on current rotation
                  const centerX = imgRect.width / 2;
                  const centerY = imgRect.height / 2;
                  const relX = x - centerX;
                  const relY = y - centerY;

                  let originalX, originalY;
                  const normalizedRotation = ((imageRotation % 360) + 360) % 360;

                  if (normalizedRotation === 90) {
                    // 90° clockwise: rotate coordinates back
                    originalX = centerY + relY;
                    originalY = centerX - relX;
                  } else if (normalizedRotation === 180) {
                    // 180°: flip both axes
                    originalX = imgRect.width - x;
                    originalY = imgRect.height - y;
                  } else if (normalizedRotation === 270) {
                    // 270° clockwise (or -90°)
                    originalX = centerY - relY;
                    originalY = centerX + relX;
                  } else { 
                    // 0° or no rotation
                    originalX = x;
                    originalY = y;
                  }

                  setImagePosition({
                    x: (originalX / imgRect.width) * 100,
                    y: (originalY / imgRect.height) * 100,
                  });
                } else {
                  setShowMagnifier(false);
                }
              }
            }}
            onMouseLeave={() => setShowMagnifier(false)}
          >
            <img
              src={selectedImageUrl}
              alt="Receipt"
              className={`max-w-[90vw] max-h-[85vh] object-contain ${
                shouldTransition ? 'transition-transform duration-200' : ''
              }`}
              style={{ transform: `rotate(${imageRotation}deg)` }}
              draggable={false}
            />

            {/* Magnifier square */}
            {showMagnifier && (
              <div
                className="absolute pointer-events-none border-2 border-white shadow-lg overflow-hidden"
                style={{
                  width: '500px',
                  height: '500px',
                  left: `${magnifierPosition.x}px`,
                  top: `${magnifierPosition.y}px`,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '8px',
                  zIndex: 100,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundImage: `url(${selectedImageUrl})`,
                    backgroundPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                    backgroundSize: `${500}% ${500}%`,
                    backgroundRepeat: 'no-repeat',
                    transform: `rotate(${imageRotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                />
              </div>
            )}
          </div>

          {/* Fullscreen toolbar - rotation only */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setImageRotation((r) => r - 90);
              }}
              className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
              title={t('image_rotate_left')}
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setImageRotation((r) => r + 90);
              }}
              className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
              title={t('image_rotate_right')}
            >
              <RotateCw className="w-5 h-5" />
            </button>
            {imageRotation !== 0 && (
              <>
                <div className="w-px h-5 bg-white/30" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageRotation(0);
                  }}
                  className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
                  title={t('image_reset')}
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Keyboard hint */}
          <div className="absolute bottom-6 right-6 text-white/50 text-xs hidden sm:block">
            ESC {t('image_exit_fullscreen')}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left sidebar - Receipt list */}
        <div
          ref={listContainerRef}
          className="w-full lg:w-1/3 xl:w-1/4 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0"
        >
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

          {/* Filter tabs */}
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
                <span>
                  {t('filter_needs_review')} ({counts.needsReview})
                </span>
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

            {/* Bulk actions bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setIsSelectMode(!isSelectMode);
                      if (isSelectMode) setSelectedIds(new Set());
                    }}
                    className={`text-xs px-2.5 py-1 rounded transition-colors ${
                      isSelectMode
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {isSelectMode
                      ? t('filter_cancel_select')
                      : t('filter_select')}
                  </button>
                  {isSelectMode && (
                    <button
                      onClick={selectAllVisible}
                      className="text-xs text-gray-500 hover:text-gray-700 px-1.5 transition-colors"
                    >
                      {selectedIds.size === receipts.length
                        ? t('filter_deselect_all')
                        : t('filter_select_all')}
                    </button>
                  )}
                </div>

                {isSelectMode && selectedIds.size > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleBulkDelete}
                      className="text-xs px-2.5 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{t('bulk_delete', { count: selectedIds.size })}</span>
                    </button>
                    <button
                      onClick={handleBulkApprove}
                      className="text-xs px-2.5 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>
                        {t('bulk_approve', { count: selectedIds.size })}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Keyboard hint - moved to separate row, subtle styling */}
              {!isSelectMode && receipts.length > 0 && (
                <div className="hidden lg:block">
                  <span className="text-[10px] text-gray-400 font-light italic">
                    {t('dashboard_keyboard_hint')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Receipt list */}
          <div className="divide-y divide-gray-100">
            {receipts.map((receipt) => (
              <div
                key={receipt.id}
                ref={(el) => {
                  if (el) receiptRefs.current.set(receipt.id, el);
                  else receiptRefs.current.delete(receipt.id);
                }}
                onClick={() => !isSelectMode && setSelectedReceipt(receipt)}
                className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedReceipt?.id === receipt.id
                    ? 'bg-primary-50 border-l-3 border-primary-600'
                    : ''
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
                  <div
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusColor(
                      receipt
                    )}`}
                  ></div>
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
                      <p className="text-xs text-gray-600 truncate flex-1 mr-2">
                        {receipt.extractedData.issuerName}
                      </p>
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
                    <p className="font-medium text-green-600">
                      {t('dashboard_all_reviewed')}
                    </p>
                    <p className="text-sm mt-2">
                      {t('dashboard_all_reviewed_hint')}
                    </p>
                  </>
                ) : filter === 'done' && counts.total > 0 ? (
                  <>
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>{t('dashboard_no_done')}</p>
                    <p className="text-sm mt-2">
                      {t('dashboard_no_done_hint')}
                    </p>
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
                    <p className="text-sm mt-2">
                      {t('dashboard_no_receipts_hint')}
                    </p>
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
            <div className="p-3 sm:p-4">
              {/* Navigation header */}
              <div className="mb-2 flex items-center">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const prevIndex =
                        currentIndex > 0
                          ? currentIndex - 1
                          : receipts.length - 1;
                      setSelectedReceipt(receipts[prevIndex]);
                    }}
                    disabled={receipts.length <= 1}
                    className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                    title={t('action_previous')}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-gray-500 min-w-[3rem] text-center">
                    {currentIndex + 1} / {receipts.length}
                  </span>
                  <button
                    onClick={() => {
                      const nextIndex =
                        currentIndex < receipts.length - 1
                          ? currentIndex + 1
                          : 0;
                      setSelectedReceipt(receipts[nextIndex]);
                    }}
                    disabled={receipts.length <= 1}
                    className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                    title={t('action_next')}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Left: Simple image viewer with rotate + fullscreen - takes 3/5 of space */}
                <div
                  className="lg:col-span-3 bg-gray-900 rounded-lg overflow-hidden relative"
                  style={{ height: '600px' }}
                >
                  {selectedImageUrl && (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                      <img
                        src={selectedImageUrl}
                        alt="Receipt"
                        className={`max-w-full max-h-full object-contain ${
                          shouldTransition
                            ? 'transition-transform duration-200'
                            : ''
                        }`}
                        style={{ transform: `rotate(${imageRotation}deg)` }}
                        draggable={false}
                      />
                    </div>
                  )}

                  {/* Simple toolbar - rotate + fullscreen only */}
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
                    <button
                      onClick={() => setImageRotation((r) => r - 90)}
                      className="p-1 hover:bg-white/20 rounded-full text-white transition-colors"
                      title={t('image_rotate_left')}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setImageRotation((r) => r + 90)}
                      className="p-1 hover:bg-white/20 rounded-full text-white transition-colors"
                      title={t('image_rotate_right')}
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-3 bg-white/30" />
                    <button
                      onClick={() => setIsFullscreen(true)}
                      className="p-1 hover:bg-white/20 rounded-full text-white transition-colors"
                      title={t('image_fullscreen')}
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    {imageRotation !== 0 && (
                      <>
                        <div className="w-px h-3 bg-white/30" />
                        <button
                          onClick={() => setImageRotation(0)}
                          className="p-1 hover:bg-white/20 rounded-full text-white transition-colors"
                          title={t('image_reset')}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Editable form - takes 2/5 of space */}
                <div className="lg:col-span-2 space-y-3">
                  {/* Needs Review Banner */}
                  {selectedReceipt.needsReview &&
                    (() => {
                      const validationResult = validateReceiptData(
                        selectedReceipt.extractedData
                      );
                      const hasWarnings = validationResult.warnings.length > 0;
                      const isLowOverallConfidence =
                        (selectedReceipt.confidence?.overall ?? 0) < 0.75;

                      // Translate validation warning to localized string
                      const translateWarning = (
                        warning: ValidationWarning
                      ): string => {
                        const key = `warning_${warning.type}` as TranslationKey;
                        return t(
                          key,
                          warning.params as
                            | Record<string, string | number>
                            | undefined
                        );
                      };

                      return (
                        <div className="bg-amber-500 text-white px-3 py-2 rounded-lg">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span className="font-medium text-sm">
                              {t('status_needs_review')}
                            </span>
                          </div>
                          {(hasWarnings || isLowOverallConfidence) && (
                            <ul className="mt-1.5 text-xs text-amber-100 space-y-0.5">
                              {isLowOverallConfidence && (
                                <li>• {t('warning_low_confidence')}</li>
                              )}
                              {validationResult.warnings.map((warning, idx) => (
                                <li key={idx}>• {translateWarning(warning)}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })()}

                  {/* AI Analysis Badge */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">
                          {t('ai_complete')} -{' '}
                          {t('ai_confidence', {
                            confidence: (
                              (selectedReceipt.confidence?.overall ?? 0) * 100
                            ).toFixed(0),
                          })}
                        </span>
                      </div>
                      {process.env.NODE_ENV === 'development' &&
                        selectedReceipt._dev?.strategy && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-mono">
                            {selectedReceipt._dev.strategy}
                          </span>
                        )}
                    </div>
                    {process.env.NODE_ENV === 'development' &&
                      selectedReceipt._dev && (
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          {selectedReceipt._dev.processingTimeMs && (
                            <span>
                              Time: {selectedReceipt._dev.processingTimeMs}ms
                            </span>
                          )}
                          {selectedReceipt._dev.estimatedCost !== undefined && (
                            <span>
                              Cost: $
                              {selectedReceipt._dev.estimatedCost.toFixed(4)}
                            </span>
                          )}
                        </div>
                      )}
                  </div>

                  {/* Issuer Name - Full width */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                      <FieldConfidenceIndicator
                        receipt={selectedReceipt}
                        fieldName="issuerName"
                      />
                      <span>{t('field_issuer_name')}</span>
                      {getFieldReviewReason(selectedReceipt, 'issuerName') && (
                        <span className="text-xs text-amber-600 font-normal ml-1">
                          {getFieldReviewReason(selectedReceipt, 'issuerName')}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={editedData.issuerName}
                      onChange={(e) =>
                        setEditedData({
                          ...editedData,
                          issuerName: e.target.value,
                        })
                      }
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${getFieldInputClassName(
                        selectedReceipt,
                        'issuerName'
                      )}`}
                    />
                  </div>

                  {/* Transaction Date - Full width */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                      <FieldConfidenceIndicator
                        receipt={selectedReceipt}
                        fieldName="transactionDate"
                      />
                      <span>{t('field_date')}</span>
                    </label>
                    <input
                      type="date"
                      value={formatDateForInput(editedData.transactionDate)}
                      onChange={(e) =>
                        setEditedData({
                          ...editedData,
                          transactionDate: new Date(e.target.value),
                        })
                      }
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${getFieldInputClassName(
                        selectedReceipt,
                        'transactionDate'
                      )}`}
                    />
                  </div>

                  {/* T-Number - Full width */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                      <FieldConfidenceIndicator
                        receipt={selectedReceipt}
                        fieldName="tNumber"
                      />
                      <span>{t('field_tnumber')}</span>
                      {getFieldReviewReason(selectedReceipt, 'tNumber') && (
                        <span className="text-xs text-amber-600 font-normal ml-1">
                          {getFieldReviewReason(selectedReceipt, 'tNumber')}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={
                        editedData.tNumber
                          ? formatTNumber(editedData.tNumber)
                          : ''
                      }
                      onChange={(e) =>
                        setEditedData({
                          ...editedData,
                          tNumber: parseTNumber(e.target.value),
                        })
                      }
                      placeholder="T 1234567890123"
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${getFieldInputClassName(
                        selectedReceipt,
                        'tNumber'
                      )}`}
                    />
                  </div>

                  {/* Total Amount - Full width */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                      <FieldConfidenceIndicator
                        receipt={selectedReceipt}
                        fieldName="totalAmount"
                      />
                      <span>{t('field_total_amount')}</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">
                        ¥
                      </span>
                      <input
                        type="number"
                        value={editedData.totalAmount}
                        onChange={(e) =>
                          setEditedData({
                            ...editedData,
                            totalAmount: parseInt(e.target.value) || 0,
                          })
                        }
                        className={`w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 text-right font-semibold ${getFieldInputClassName(
                          selectedReceipt,
                          'totalAmount'
                        )}`}
                      />
                    </div>
                  </div>

                  {/* Expense Category - Full width */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                      <FieldConfidenceIndicator
                        receipt={selectedReceipt}
                        fieldName="category"
                      />
                      <span>{t('field_category')}</span>
                      {getFieldReviewReason(selectedReceipt, 'category') && (
                        <span className="text-xs text-amber-600 font-normal ml-1">
                          {getFieldReviewReason(selectedReceipt, 'category')}
                        </span>
                      )}
                    </label>

                    {/* Equipment threshold warning */}
                    {shouldSuggestEquipmentCategory(editedData) && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 mb-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-purple-900">
                              {t(
                                'warning_equipment_threshold_title' as TranslationKey
                              )}
                            </span>
                            <p className="text-xs text-purple-700 mt-0.5">
                              {t(
                                'warning_equipment_threshold' as TranslationKey
                              )}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setEditedData({
                                  ...editedData,
                                  suggestedCategory: '工具器具備品',
                                })
                              }
                              className="mt-2 text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                            >
                              {t(
                                'warning_equipment_change_category' as TranslationKey
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <select
                      value={editedData.suggestedCategory}
                      onChange={(e) =>
                        setEditedData({
                          ...editedData,
                          suggestedCategory: e.target.value as ExpenseCategory,
                        })
                      }
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${getFieldInputClassName(
                        selectedReceipt,
                        'category'
                      )}`}
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {language === 'en'
                            ? t(`category_${cat.value}` as TranslationKey)
                            : cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tax Rate display */}
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200">
                    <div className="text-xs font-medium text-gray-600 mb-1.5">
                      {t('field_tax_rate')}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editedData.taxBreakdown.map((tb, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-white border border-gray-300 rounded text-sm font-medium"
                        >
                          {tb.taxRate}%: ¥{(tb.taxAmount ?? 0).toLocaleString()}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2.5 text-sm border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center justify-center gap-2 font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{t('delete')}</span>
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex-1 px-4 py-2.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-medium"
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
                <p className="text-sm mt-2">{t('dashboard_select_hint')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
