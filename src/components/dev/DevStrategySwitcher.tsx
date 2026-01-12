'use client';

import { useState, useEffect } from 'react';
import {
  Beaker,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  Zap,
  DollarSign,
  Gauge,
  X,
} from 'lucide-react';
import {
  OCR_STRATEGIES,
  DEV_STRATEGY_STORAGE_KEY,
  DEFAULT_OCR_STRATEGY,
  type OCRStrategy,
  type OCRStrategyConfig,
} from '@/types/ocr-strategy';

interface DevStrategySwitcherProps {
  onStrategyChange?: (strategy: OCRStrategy) => void;
}

export function DevStrategySwitcher({ onStrategyChange }: DevStrategySwitcherProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<OCRStrategy>(DEFAULT_OCR_STRATEGY);
  const [showDetails, setShowDetails] = useState<OCRStrategy | null>(null);

  // Load saved strategy from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(DEV_STRATEGY_STORAGE_KEY);
    if (saved && OCR_STRATEGIES.some(s => s.id === saved)) {
      setSelectedStrategy(saved as OCRStrategy);
    }
  }, []);

  // Save strategy to localStorage when changed
  const handleStrategyChange = (strategy: OCRStrategy) => {
    console.log('[DevStrategySwitcher] Changing strategy to:', strategy);
    setSelectedStrategy(strategy);
    localStorage.setItem(DEV_STRATEGY_STORAGE_KEY, strategy);
    console.log('[DevStrategySwitcher] Saved to localStorage:', localStorage.getItem(DEV_STRATEGY_STORAGE_KEY));

    // Dispatch custom event to notify all components in the same window
    window.dispatchEvent(new CustomEvent('ocr-strategy-changed', { detail: strategy }));

    onStrategyChange?.(strategy);
  };

  const currentStrategy = OCR_STRATEGIES.find(s => s.id === selectedStrategy);

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getQualityLabel = (quality: string) => {
    switch (quality) {
      case 'high':
        return 'High';
      case 'medium':
        return 'Medium';
      case 'low':
        return 'Low';
      default:
        return quality;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Collapsed State - Small Badge */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 transition-colors"
        >
          <Beaker className="w-4 h-4" />
          <span className="text-sm font-medium">DEV: {currentStrategy?.name.split(' ')[0]}</span>
          <ChevronUp className="w-4 h-4" />
        </button>
      )}

      {/* Expanded State - Full Panel */}
      {isExpanded && (
        <div className="w-96 bg-white rounded-xl shadow-2xl border border-purple-200 overflow-hidden">
          {/* Header */}
          <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Beaker className="w-5 h-5" />
              <span className="font-semibold">OCR Strategy Tester</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-purple-500 rounded"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Warning Banner */}
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
            <span className="text-xs text-yellow-700">
              Dev-only feature. Will not appear in production.
            </span>
          </div>

          {/* Strategy List */}
          <div className="max-h-96 overflow-y-auto">
            {OCR_STRATEGIES.map((strategy) => (
              <div key={strategy.id} className="border-b border-gray-100 last:border-0">
                {/* Strategy Row */}
                <div
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    selectedStrategy === strategy.id
                      ? 'bg-purple-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => strategy.isImplemented && handleStrategyChange(strategy.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {/* Selection indicator */}
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedStrategy === strategy.id
                              ? 'border-purple-600 bg-purple-600'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedStrategy === strategy.id && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>

                        {/* Strategy name */}
                        <span
                          className={`font-medium ${
                            strategy.isImplemented ? 'text-gray-900' : 'text-gray-400'
                          }`}
                        >
                          {strategy.name}
                        </span>

                        {/* Not implemented badge */}
                        {!strategy.isImplemented && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                            Coming Soon
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-gray-500 mt-1 ml-7">
                        {strategy.description}
                      </p>

                      {/* Quick stats */}
                      <div className="flex items-center gap-4 mt-2 ml-7">
                        <div className="flex items-center gap-1 text-xs">
                          <DollarSign className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-600">{strategy.costPerImage}</span>
                        </div>
                        <div
                          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${getQualityColor(
                            strategy.quality
                          )}`}
                        >
                          <Gauge className="w-3 h-3" />
                          <span>{getQualityLabel(strategy.quality)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Expand details button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDetails(showDetails === strategy.id ? null : strategy.id);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      {showDetails === strategy.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {showDetails === strategy.id && (
                  <StrategyDetails strategy={strategy} />
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                Current: <strong className="text-purple-600">{currentStrategy?.name}</strong>
              </span>
              <span>Est. cost: {currentStrategy?.costPerImage}/image</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StrategyDetails({ strategy }: { strategy: OCRStrategyConfig }) {
  return (
    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
      <div className="grid grid-cols-2 gap-4">
        {/* Pros */}
        <div>
          <h4 className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
            <Check className="w-3 h-3" /> Pros
          </h4>
          <ul className="space-y-1">
            {strategy.pros.map((pro, i) => (
              <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                <span className="text-green-500 mt-0.5">+</span>
                {pro}
              </li>
            ))}
          </ul>
        </div>

        {/* Cons */}
        <div>
          <h4 className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
            <X className="w-3 h-3" /> Cons
          </h4>
          <ul className="space-y-1">
            {strategy.cons.map((con, i) => (
              <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                <span className="text-red-500 mt-0.5">-</span>
                {con}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Implementation status */}
      {!strategy.isImplemented && (
        <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-yellow-700">
          <strong>Not yet implemented.</strong> This strategy requires additional setup
          (e.g., PaddleOCR server, Qwen model hosting).
        </div>
      )}
    </div>
  );
}

// Hook to get current strategy
export function useOCRStrategy(): OCRStrategy {
  const [strategy, setStrategy] = useState<OCRStrategy>(DEFAULT_OCR_STRATEGY);

  useEffect(() => {
    // Load initial value from localStorage
    const saved = localStorage.getItem(DEV_STRATEGY_STORAGE_KEY);
    if (saved && OCR_STRATEGIES.some(s => s.id === saved)) {
      setStrategy(saved as OCRStrategy);
      console.log('[useOCRStrategy] Loaded from localStorage:', saved);
    }

    // Listen for custom event (same window changes)
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<OCRStrategy>;
      console.log('[useOCRStrategy] Received custom event:', customEvent.detail);
      setStrategy(customEvent.detail);
    };

    // Listen for storage changes (different tab changes)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === DEV_STRATEGY_STORAGE_KEY && e.newValue) {
        console.log('[useOCRStrategy] Received storage event:', e.newValue);
        setStrategy(e.newValue as OCRStrategy);
      }
    };

    window.addEventListener('ocr-strategy-changed', handleCustomEvent);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('ocr-strategy-changed', handleCustomEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return strategy;
}
