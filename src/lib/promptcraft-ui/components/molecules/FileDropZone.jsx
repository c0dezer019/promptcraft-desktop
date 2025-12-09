import React, { useState, useRef } from 'react';
import { Upload, File } from 'lucide-react';

/**
 * FileDropZone - Drag & drop file upload with button fallback
 * @param {function} onFileSelect - Callback when file is selected
 * @param {string} acceptedFormats - Accepted file formats (e.g., '.png,.txt')
 * @param {string} className - Additional CSS classes
 */
export const FileDropZone = ({ onFileSelect, acceptedFormats, className = '' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    console.log('📁 Files dropped:', files);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    console.log('📁 Files selected via input:', files);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all
        ${isDragging
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
          : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500'
        }
        ${className}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats}
        onChange={handleFileInput}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-2 text-center">
        {isDragging ? (
          <File className="text-indigo-500" size={32} />
        ) : (
          <Upload className="text-gray-400" size={32} />
        )}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {isDragging ? 'Drop file here' : 'Drag & drop or click to browse'}
        </p>
        <p className="text-xs text-gray-400">
          Supports: {acceptedFormats}
        </p>
      </div>
    </div>
  );
};
