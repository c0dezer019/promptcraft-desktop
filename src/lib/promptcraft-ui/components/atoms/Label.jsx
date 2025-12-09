import React from 'react';

/**
 * Label Component - Atomic Design
 */
export const Label = ({ children, required = false, className = '' }) => {
  return (
    <label className={`block text-xs font-semibold text-gray-500 uppercase mb-1 ${className}`}>
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
};

/**
 * FieldLabel - Label for form fields with better styling
 */
export const FieldLabel = ({ children, className = '' }) => {
  return (
    <label className={`block text-[10px] font-medium text-gray-500 mb-1 ${className}`}>
      {children}
    </label>
  );
};
