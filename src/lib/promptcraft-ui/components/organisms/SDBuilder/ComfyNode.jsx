import React from 'react';
import { GripHorizontal, Trash2, Plus } from 'lucide-react';
import { Input, TextArea, Select } from '../../atoms';
import { FieldLabel } from '../../atoms';

/**
 * ComfyNode Component - Individual node in ComfyUI workflow
 * @param {object} node - Node data
 * @param {number} index - Node index
 * @param {function} onRemove - Remove handler
 * @param {function} onFieldUpdate - Field update handler
 * @param {function} onAddField - Add custom field handler
 */
export const ComfyNode = ({ node, index, onRemove, onFieldUpdate, onAddField }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800 shadow-sm relative group transition-all hover:border-indigo-300 dark:hover:border-indigo-600">
      {/* Node Header */}
      <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} className="text-gray-300 cursor-move" />
          <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
            {node.title} <span className="text-gray-400 font-normal">#{index + 1}</span>
          </span>
          {node.type === 'custom' && (
            <span className="bg-orange-100 text-orange-600 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
              Custom
            </span>
          )}
        </div>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Dynamic Fields Rendering */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
        {Object.entries(node.fields).map(([key, field]) => {
          const isFullWidth = field.type === 'textarea' || field.type === 'text';
          return (
            <div
              key={key}
              className={`col-span-1 ${isFullWidth ? 'md:col-span-3 lg:col-span-6' : 'md:col-span-2'}`}
            >
              <FieldLabel>{field.label || key}</FieldLabel>

              {field.type === 'select' ? (
                <Select
                  value={field.value}
                  onChange={(e) => onFieldUpdate(key, e.target.value)}
                  options={field.options}
                  className="text-xs p-3 sm:p-1.5"
                />
              ) : field.type === 'textarea' ? (
                <TextArea
                  value={field.value}
                  onChange={(e) => onFieldUpdate(key, e.target.value)}
                  className="text-xs p-3 sm:p-1.5 h-16 font-mono"
                />
              ) : (
                <Input
                  type={field.type}
                  value={field.value}
                  onChange={(e) =>
                    onFieldUpdate(key, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)
                  }
                  className="text-xs p-3 sm:p-1.5 font-mono"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Add Custom Field Button (for custom nodes) */}
      {node.type === 'custom' && (
        <button
          onClick={onAddField}
          className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1"
        >
          <Plus size={12} /> Add Custom Field
        </button>
      )}
    </div>
  );
};
