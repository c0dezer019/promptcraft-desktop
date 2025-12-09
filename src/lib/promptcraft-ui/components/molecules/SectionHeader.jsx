import React from 'react';

/**
 * SectionHeader Component - Molecular Design
 * Used for section titles with icons and optional actions
 */
export const SectionHeader = ({ icon: Icon, title, resetAction, extra }) => (
  <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
      <Icon size={18} className="text-indigo-500" />
      <h3 className="font-semibold text-sm uppercase tracking-wider">{title}</h3>
    </div>
    <div className="flex items-center gap-2">
            {extra}
      {resetAction && (
        <button
          onClick={resetAction}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Reset
        </button>
      )}
    </div>
  </div>
);
