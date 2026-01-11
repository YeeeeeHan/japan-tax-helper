'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { v4 as uuidv4 } from 'uuid';
import { CloudUpload, FileImage, CheckCircle2, AlertCircle, Loader2, X, ArrowRight, RefreshCcw, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { storeImage } from '@/lib/storage/images';
import { addReceipt } from '@/lib/db/operations';
import type { Receipt } from '@/types/receipt';
import { formatFileSize } from '@/lib/utils/format';
import { UPLOAD_CONSTRAINTS } from '@/lib/utils/constants';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { useI18n } from '@/lib/i18n/context';

interface FileWithStatus {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  receiptId?: string;
  thumbnailUrl?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileWithStatus | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);

  // Generate thumbnails for uploaded files
  useEffect(() => {
    files.forEach(f => {
      if (!f.thumbnailUrl && f.file.type.startsWith('image/')) {
        const url = URL.createObjectURL(f.file);
        setFiles(prev => prev.map(file =>
          file.id === f.id ? { ...file, thumbnailUrl: url } : file
        ));
      }
    });
    // Cleanup URLs on unmount
    return () => {
      files.forEach(f => {
        if (f.thumbnailUrl) URL.revokeObjectURL(f.thumbnailUrl);
      });
    };
  }, [files.length]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileWithStatus[] = acceptedFiles.map(file => ({
      id: uuidv4(),
      file,
      status: 'pending',
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/heic': ['.heic'],
      'application/pdf': ['.pdf'],
    },
    maxSize: UPLOAD_CONSTRAINTS.MAX_FILE_SIZE,
    multiple: true,
  });

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.thumbnailUrl) URL.revokeObjectURL(file.thumbnailUrl);
      return prev.filter(f => f.id !== id);
    });
  };

  const processFile = async (fileWithStatus: FileWithStatus) => {
    const { id, file } = fileWithStatus;

    try {
      setFiles(prev =>
        prev.map(f => (f.id === id ? { ...f, status: 'uploading' as const, progress: 10 } : f))
      );

      const imageId = uuidv4();
      await storeImage(file, imageId);

      setFiles(prev =>
        prev.map(f => (f.id === id ? { ...f, status: 'processing' as const, progress: 30 } : f))
      );

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process receipt');
      }

      const result = await response.json();

      setFiles(prev =>
        prev.map(f => (f.id === id ? { ...f, progress: 80 } : f))
      );

      const receipt: Receipt = {
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
        imageId,
        imageUrl: URL.createObjectURL(file),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        extractedData: result.data.extractedData,
        processingStatus: 'completed',
        confidence: result.data.confidence,
        isManuallyReviewed: false,
        needsReview: result.data.needsReview,
        notes: result.data.validation.warnings?.join(', '),
      };

      await addReceipt(receipt);

      setFiles(prev =>
        prev.map(f =>
          f.id === id
            ? { ...f, status: 'completed' as const, progress: 100, receiptId: receipt.id }
            : f
        )
      );
    } catch (error: any) {
      console.error('Error processing file:', error);
      setFiles(prev =>
        prev.map(f =>
          f.id === id
            ? { ...f, status: 'failed' as const, error: error.message }
            : f
        )
      );
    }
  };

  const processAll = async () => {
    setShowConfirmModal(false);
    setIsProcessing(true);

    for (const file of files) {
      if (file.status === 'pending') {
        await processFile(file);
      }
    }

    setIsProcessing(false);
  };

  const retryFile = async (id: string) => {
    const fileToRetry = files.find(f => f.id === id);
    if (!fileToRetry || fileToRetry.status !== 'failed') return;

    // Reset status to pending first
    setFiles(prev =>
      prev.map(f =>
        f.id === id ? { ...f, status: 'pending' as const, progress: 0, error: undefined } : f
      )
    );

    // Process the file
    await processFile({ ...fileToRetry, status: 'pending', progress: 0, error: undefined });
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const processingCount = files.filter(f => f.status === 'processing' || f.status === 'uploading').length;
  const completedCount = files.filter(f => f.status === 'completed').length;
  const failedCount = files.filter(f => f.status === 'failed').length;
  const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);
  const progressPercent = files.length > 0 ? Math.round((completedCount / files.length) * 100) : 0;

  // Preview navigation
  const openPreview = (file: FileWithStatus) => {
    setPreviewFile(file);
    setPreviewZoom(1);
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewZoom(1);
  };

  const navigatePreview = (direction: 'prev' | 'next') => {
    if (!previewFile) return;
    const currentIndex = files.findIndex(f => f.id === previewFile.id);
    let newIndex: number;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : files.length - 1;
    } else {
      newIndex = currentIndex < files.length - 1 ? currentIndex + 1 : 0;
    }
    setPreviewFile(files[newIndex]);
    setPreviewZoom(1);
  };

  const previewIndex = previewFile ? files.findIndex(f => f.id === previewFile.id) : -1;

  // Keyboard navigation for preview modal
  useEffect(() => {
    if (!previewFile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigatePreview('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigatePreview('next');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closePreview();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setPreviewZoom(z => Math.min(3, z + 0.25));
      } else if (e.key === '-') {
        e.preventDefault();
        setPreviewZoom(z => Math.max(0.5, z - 0.25));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewFile, files]);

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header - Simplified */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <FileImage className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">TaxHelper Japan</h1>
            </div>
            <div className="flex items-center space-x-3">
              <LanguageSwitcher />
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('upload_title')}</h2>
        <p className="text-gray-600 mb-8">
          {t('upload_subtitle')}
        </p>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-8 md:p-12 text-center cursor-pointer
            transition-colors duration-150
            ${
              isDragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 bg-white hover:border-primary-400'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <CloudUpload className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('upload_dropzone_title')}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {t('upload_dropzone_subtitle')}
            </p>
            <button
              type="button"
              className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              {t('upload_file_select')}
            </button>
          </div>
        </div>

        {/* Thumbnail Grid */}
        {files.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">
                {t('upload_files')} ({files.length})
              </h3>
              {pendingCount > 0 && !isProcessing && (
                <button
                  onClick={() => setFiles([])}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {t('upload_clear_all')}
                </button>
              )}
            </div>

            {/* Grid of thumbnails */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {files.map(fileWithStatus => (
                <div
                  key={fileWithStatus.id}
                  className="relative group aspect-square bg-white rounded-lg border border-gray-200 overflow-hidden cursor-pointer"
                  onClick={() => openPreview(fileWithStatus)}
                >
                  {/* Thumbnail image */}
                  {fileWithStatus.thumbnailUrl ? (
                    <img
                      src={fileWithStatus.thumbnailUrl}
                      alt={fileWithStatus.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <FileImage className="w-8 h-8 text-gray-400" />
                    </div>
                  )}

                  {/* Status overlay */}
                  {fileWithStatus.status === 'completed' && (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                  )}
                  {fileWithStatus.status === 'failed' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        retryFile(fileWithStatus.id);
                      }}
                      className="absolute inset-0 bg-red-500/20 flex flex-col items-center justify-center cursor-pointer hover:bg-red-500/30 transition-colors"
                      title={t('upload_click_to_retry')}
                    >
                      <RefreshCcw className="w-6 h-6 text-red-600 mb-1" />
                      <span className="text-xs text-red-700 font-medium">{t('upload_retry')}</span>
                    </button>
                  )}
                  {(fileWithStatus.status === 'processing' || fileWithStatus.status === 'uploading') && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                    </div>
                  )}

                  {/* Remove button (only for pending files) */}
                  {fileWithStatus.status === 'pending' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(fileWithStatus.id);
                      }}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  )}

                  {/* File name tooltip on hover */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate">{fileWithStatus.file.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Sticky Bottom Bar */}
      {files.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Progress bar (shown during processing) */}
            {isProcessing && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">
                    {t('upload_processing_status')} {completedCount}/{files.length}
                  </span>
                  <span className="text-sm font-medium text-primary-600">{progressPercent}%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary-600 h-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Summary and actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Summary stats */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{t('upload_files_count')}</span>
                  <span className="font-medium text-gray-900">{files.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{t('upload_total_size')}</span>
                  <span className="font-medium text-gray-900">{formatFileSize(totalSize)}</span>
                </div>
                {completedCount > 0 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-medium">{completedCount} {t('upload_done')}</span>
                  </div>
                )}
                {failedCount > 0 && (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">{failedCount} {t('upload_failed')}</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                {completedCount === files.length && files.length > 0 ? (
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
                  >
                    <span>{t('upload_go_to_dashboard')}</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={pendingCount === 0 || isProcessing}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                  >
                    {isProcessing && <Loader2 className="w-5 h-5 animate-spin" />}
                    <span>
                      {isProcessing
                        ? t('upload_processing_status')
                        : t('upload_process_files', { count: pendingCount })}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {t('upload_confirm_title')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('upload_confirm_message', { count: pendingCount, size: formatFileSize(totalSize) })}
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{t('upload_files_count')}</span>
                  <p className="font-medium text-gray-900">{pendingCount}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t('upload_total_size')}</span>
                  <p className="font-medium text-gray-900">{formatFileSize(totalSize)}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={processAll}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
              >
                {t('upload_start_processing')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
          onClick={closePreview}
        >
          {/* Close button */}
          <button
            onClick={closePreview}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation - Previous */}
          {files.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigatePreview('prev');
              }}
              className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Image container */}
          <div
            className="max-w-[90vw] max-h-[80vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {previewFile.thumbnailUrl ? (
              <img
                src={previewFile.thumbnailUrl}
                alt={previewFile.file.name}
                className="max-w-full max-h-[80vh] object-contain transition-transform duration-200"
                style={{ transform: `scale(${previewZoom})` }}
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center bg-gray-800 rounded-lg">
                <FileImage className="w-16 h-16 text-gray-500" />
              </div>
            )}
          </div>

          {/* Navigation - Next */}
          {files.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigatePreview('next');
              }}
              className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Bottom toolbar */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
            {/* Zoom controls */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewZoom(z => Math.max(0.5, z - 0.25));
              }}
              className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-white text-sm min-w-[4rem] text-center">
              {Math.round(previewZoom * 100)}%
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewZoom(z => Math.min(3, z + 0.25));
              }}
              className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-5 h-5" />
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-white/30" />

            {/* Counter */}
            <span className="text-white text-sm">
              {previewIndex + 1} / {files.length}
            </span>
          </div>

          {/* File name */}
          <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-1 rounded-lg">
            {previewFile.file.name}
          </div>
        </div>
      )}
    </div>
  );
}
