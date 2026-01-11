'use client';

import { Globe } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import type { Language } from '@/lib/i18n/translations';

export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();

  const toggleLanguage = () => {
    const newLang: Language = language === 'ja' ? 'en' : 'ja';
    setLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      title="Switch language / 言語を切り替える"
    >
      <Globe className="w-4 h-4 text-gray-600" />
      <span className="text-sm font-medium text-gray-700">
        {language === 'ja' ? 'EN' : 'JP'}
      </span>
    </button>
  );
}

// Legacy hook for backward compatibility - redirects to context
export function useLanguage(): [Language, (lang: Language) => void] {
  const { language, setLanguage } = useI18n();
  return [language, setLanguage];
}
