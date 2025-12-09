import React from 'react';

/**
 * Button Component - Atomic Design
 * @param {string} variant - 'primary' | 'secondary' | 'danger' | 'ghost'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {ReactNode} children - Button content
 * @param {string} className - Additional CSS classes
 * @param {boolean} disabled - Disabled state
 * @param {function} onClick - Click handler
 */
export const Button = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled = false,
  ...props
}) => {
  const baseClasses = 'rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20',
    secondary: 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    ghost: 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200 dark:border-gray-700'
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Icon Button - Button with icon only
 */
export const IconButton = ({ icon: Icon, className = '', ...props }) => {
  return (
    <button
      className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${className}`}
      {...props}
    >
      <Icon size={20} />
    </button>
  );
};
