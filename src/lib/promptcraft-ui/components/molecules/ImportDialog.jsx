import React from 'react';
import { X, AlertCircle, FileCheck } from 'lucide-react';
import { Button } from '../atoms/Button';

/**
 * ImportDialog - Confirmation modal for workflow import
 * @param {boolean} isOpen - Dialog open state
 * @param {function} onClose - Close callback
 * @param {function} onImport - Import callback with action ('replace' | 'merge')
 * @param {object} importData - Parsed workflow data
 * @param {string} error - Error message if import failed
 */
export const ImportDialog = ({ isOpen, onClose, onImport, importData, error }) => {
  console.log('🎨 ImportDialog render:', { isOpen, hasData: !!importData, error });
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <FileCheck size={20} className="text-indigo-500" />
            Import Workflow
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error ? (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Found valid workflow data. How would you like to import it?
                </p>
              </div>

              {importData && (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-xs font-mono max-h-32 overflow-y-auto">
                  <div className="space-y-1 text-gray-600 dark:text-gray-400">
                    {importData.prompt && (
                      <p className="truncate">
                        <span className="font-bold">Positive:</span> {importData.prompt.substring(0, 60)}...
                      </p>
                    )}
                    {importData.negativePrompt && (
                      <p className="truncate">
                        <span className="font-bold">Negative:</span> {importData.negativePrompt.substring(0, 60)}...
                      </p>
                    )}
                    {importData.params && (
                      <p>
                        <span className="font-bold">Parameters:</span> {Object.keys(importData.params).length} fields
                      </p>
                    )}
                    {importData.nodes && (
                      <p>
                        <span className="font-bold">Nodes:</span> {importData.nodes.length} found
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => onImport('replace')}
                >
                  Replace Current Workflow
                </Button>

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => onImport('merge')}
                >
                  Merge with Current
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
