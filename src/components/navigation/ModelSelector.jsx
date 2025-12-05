import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Star, Monitor, FileText, Check } from 'lucide-react';
import { IMAGE_MODELS, VIDEO_MODELS, getModelById } from '../../constants/models.js';

/**
 * ModelSelector Component - Dropdown with grouped Standard/High Quality models
 */
export const ModelSelector = ({ category, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const models = category === 'image' ? IMAGE_MODELS : VIDEO_MODELS;
  const selectedModel = getModelById(value);

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

  const renderModelOption = (model, showTierBadge = false, tierIcon = null) => {
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
        <div className="flex items-center gap-2">
          <span className="font-medium">{model.name}</span>
          {tierIcon && (
            <span className="text-gray-400 dark:text-gray-500">
              {tierIcon}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showTierBadge && (
            <Star className="w-3.5 h-3.5 text-amber-500" />
          )}
          {isSelected && (
            <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          )}
        </div>
      </button>
    );
  };

  const renderGroup = (title, modelList, options = {}) => {
    if (!modelList || modelList.length === 0) return null;

    const { showProBadge = false, icon: GroupIcon = null } = options;

    return (
      <div className="py-1">
        <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          {GroupIcon && <GroupIcon className="w-3.5 h-3.5" />}
          {title}
        </div>
        {modelList.map(model => renderModelOption(
          model,
          showProBadge,
          null
        ))}
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
          ${isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-gray-800'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
          }
        `}
      >
        <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[100px] text-left">
          {selectedModel?.name || 'Select Model'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 max-h-80 overflow-y-auto">
          {/* Standard Tier */}
          {renderGroup('Standard', models.standard)}

          {/* Divider */}
          <div className="my-1 border-t border-gray-200 dark:border-gray-700" />

          {/* High Quality Tier */}
          {renderGroup('High Quality', models.highQuality, { showProBadge: true, icon: Star })}

          {/* Local Tools (Image only) */}
          {category === 'image' && models.local && models.local.length > 0 && (
            <>
              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
              {renderGroup('Local Tools', models.local, { icon: Monitor })}
            </>
          )}

          {/* Prompt Builders (Image only) */}
          {category === 'image' && models.promptOnly && models.promptOnly.length > 0 && (
            <>
              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
              {renderGroup('Prompt Builders', models.promptOnly, { icon: FileText })}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
