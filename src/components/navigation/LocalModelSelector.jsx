import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { useLocalModels } from '../../hooks/useLocalModels.js';
import { formatModelName } from '../../utils/localModelDiscovery.js';
import { getActiveTool } from '../../utils/localToolConfig.js';

/**
 * LocalModelSelector Component
 * Dropdown for selecting local model checkpoints
 */
export const LocalModelSelector = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { models, loading, error, refetch } = useLocalModels();

  const activeTool = getActiveTool();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSelect = (modelId) => {
    onChange(modelId);
    setIsOpen(false);
  };

  const handleRefresh = async (e) => {
    e.stopPropagation();
    await refetch();
  };

  // Find selected model
  const selectedModel = models.find(m => m.id === value);
  const displayName = selectedModel
    ? formatModelName(selectedModel.name)
    : 'Select Model';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading || !!error}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
          ${isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-gray-800'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
          }
          ${(loading || error) ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
        ) : error ? (
          <AlertCircle className="w-4 h-4 text-red-500" />
        ) : null}
        <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[120px] text-left">
          {error ? 'Connection Error' : displayName}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !error && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 max-h-96 overflow-y-auto">
          {/* Header with Refresh */}
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              {activeTool?.name || 'Local'} Models
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
              title="Refresh models"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Model List */}
          <div className="py-1">
            {loading && models.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                Loading models...
              </div>
            ) : models.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                <AlertCircle className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                No models found
              </div>
            ) : (
              models.map(model => {
                const isSelected = value === model.id;
                return (
                  <button
                    key={model.id}
                    onClick={() => handleSelect(model.id)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 text-left text-sm rounded-md transition-colors
                      ${isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }
                    `}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {formatModelName(model.name)}
                      </div>
                      {model.hash && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono">
                          {model.hash.substring(0, 8)}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Error State Tooltip */}
      {error && isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-red-200 dark:border-red-800 p-4 z-50">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
                Failed to load models
              </div>
              <div className="text-xs text-red-600 dark:text-red-300">
                {error}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Make sure {activeTool?.name || 'the tool'} is running at {activeTool?.apiUrl}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalModelSelector;
