import React from 'react';
import { FieldLabel } from '../atoms';
import { Input, TextArea, Select } from '../atoms';

/**
 * FormField Component - Label + Input combination
 * @param {string} label - Field label
 * @param {string} type - 'text' | 'number' | 'textarea' | 'select'
 * @param {any} value - Field value
 * @param {function} onChange - Change handler
 * @param {Array} options - Options for select (optional)
 * @param {object} props - Additional props
 */
export const FormField = ({
  label,
  type = 'text',
  value,
  onChange,
  options = [],
  className = '',
  ...props
}) => {
  return (
    <div className={className}>
      <FieldLabel>{label}</FieldLabel>
      {type === 'textarea' ? (
        <TextArea value={value} onChange={onChange} {...props} />
      ) : type === 'select' ? (
        <Select value={value} onChange={onChange} options={options} {...props} />
      ) : (
        <Input type={type} value={value} onChange={onChange} {...props} />
      )}
    </div>
  );
};
