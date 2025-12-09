import { useState } from 'react';
import { X, Link2, Loader } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';

/**
 * URLImportDialog - Import workflow from URL
 * @param {boolean} isOpen - Dialog open state
 * @param {function} onClose - Close callback
 * @param {function} onFetch - Fetch callback with URL
 */
export const URLImportDialog = ({ isOpen, onClose, onFetch }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFetch = async () => {
    if (!url) return;
    setLoading(true);
    try {
      await onFetch(url);
      setUrl('');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && url && !loading) {
      handleFetch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Link2 size={20} className="text-indigo-500" />
            Import from URL
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
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
              Workflow URL
            </label>
            <Input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://example.com/workflow.json"
              disabled={loading}
            />
          </div>

          <Button
            variant="primary"
            className="w-full"
            onClick={handleFetch}
            disabled={!url || loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader size={16} className="animate-spin" />
                Fetching...
              </span>
            ) : (
              'Fetch Workflow'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
