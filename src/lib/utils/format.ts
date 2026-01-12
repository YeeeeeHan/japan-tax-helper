// Formatting utilities for Japanese text, dates, and numbers

/**
 * Format date for Japanese display (yyyy/mm/dd)
 */
export function formatDate(date: Date | string | null | undefined, locale: 'ja' | 'en' = 'ja'): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  // Check if date is invalid
  if (isNaN(d.getTime())) return '';

  return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    calendar: 'gregory',
  }).format(d);
}

/**
 * Format date for input field (yyyy-mm-dd)
 */
export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  // Check if date is invalid
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format currency in Japanese Yen
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ja-JP').format(num);
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format T-Number with space after T
 */
export function formatTNumber(tNumber: string | null): string {
  if (!tNumber) return '';
  // Add space after T: T1234567890123 -> T 1234567890123
  return tNumber.replace(/^T(\d+)$/, 'T $1');
}

/**
 * Parse T-Number from formatted string
 */
export function parseTNumber(formatted: string): string {
  // Remove space: T 1234567890123 -> T1234567890123
  return formatted.replace(/\s/g, '');
}
