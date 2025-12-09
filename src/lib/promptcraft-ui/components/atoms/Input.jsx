import React from 'react';

/**
 * Input Component - Atomic Design
 */
export const Input = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  className = '',
  icon: Icon,
  ...props
}) => {
  const baseClasses = 'w-full p-2.5 bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm';

  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${baseClasses} ${Icon ? 'pr-10' : ''} ${className}`}
        {...props}
      />
      {Icon && (
        <Icon className="absolute right-3 top-2.5 text-gray-400" size={16} />
      )}
    </div>
  );
};

/**
 * TextArea Component
 */
export const TextArea = ({
  value,
  onChange,
  placeholder,
  className = '',
  rows = 4,
  ...props
}) => {
  const baseClasses = 'w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm leading-relaxed';

  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={`${baseClasses} ${className}`}
      {...props}
    />
  );
};

/**
 * Select Component
 */
export const Select = ({
  value,
  onChange,
  options = [],
  className = '',
  ...props
}) => {
  const baseClasses = 'w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-900 dark:text-gray-100';

  return (
    <select
      value={value}
      onChange={onChange}
      className={`${baseClasses} ${className}`}
      style={{
        colorScheme: 'dark'
      }}
      {...props}
    >
      {options.map((opt, idx) => (
        <option
          key={idx}
          value={typeof opt === 'string' ? opt : opt.value}
          style={{
            backgroundColor: 'rgb(31, 41, 55)',
            color: 'rgb(243, 244, 246)'
          }}
        >
          {typeof opt === 'string' ? opt : opt.label}
        </option>
      ))}
    </select>
  );
};
