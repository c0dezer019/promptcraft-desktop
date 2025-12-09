import React from 'react';
import { Sparkles, Loader2, Zap } from 'lucide-react';

/**
 * EnhanceButton Component - Button with loading state for AI enhancement
 * @param {boolean} isEnhancing - Loading state
 * @param {boolean} disabled - Disabled state
 * @param {function} onClick - Click handler
 * @param {string} variant - 'enhance' | 'auto' (for different icons/colors)
 * @param {string} label - Button label
 */
export const EnhanceButton = ({
  isEnhancing,
  disabled,
  onClick,
  variant = 'enhance',
  label,
  className = ''
}) => {
  const Icon = isEnhancing ? Loader2 : (variant === 'auto' ? Zap : Sparkles);
  const iconClass = isEnhancing ? 'animate-spin' : '';

  const variantStyles = {
    enhance: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white',
    auto: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    refine: 'bg-gray-800 dark:bg-white text-white dark:text-black'
  };

  return (
    <button
      onClick={onClick}
      disabled={isEnhancing || disabled}
      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${className}`}
    >
      <Icon size={12} className={iconClass} />
      {label || (variant === 'auto' ? 'Auto-Generate' : 'Enhance')}
    </button>
  );
};
