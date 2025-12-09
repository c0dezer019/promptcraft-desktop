import React from 'react';
import { X, Settings, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '../lib/promptcraft-ui/components/atoms/Button.jsx';

/**
 * EnhancementErrorModal - Modal for enhancement API errors
 * @param {boolean} isOpen - Whether modal is open
 * @param {function} onClose - Close handler
 * @param {function} onOpenSettings - Opens settings modal
 * @param {string} error - Error message to display
 */
export const EnhancementErrorModal = ({ isOpen, onClose, onOpenSettings, error }) => {
  if (!isOpen) return null;

  const handleOpenSettings = () => {
    onClose();
    onOpenSettings();
  };

  // Determine provider and error type from error message
  const getProviderFromError = () => {
    const errorLower = error.toLowerCase();
    if (errorLower.includes('openai')) return 'openai';
    if (errorLower.includes('anthropic') || errorLower.includes('claude')) return 'anthropic';
    if (errorLower.includes('gemini') || errorLower.includes('google')) return 'gemini';
    if (errorLower.includes('minimax')) return 'minimax';
    if (errorLower.includes('venice')) return 'venice';
    return null;
  };

  const getTroubleshootingLinks = () => {
    const provider = getProviderFromError();
    const errorLower = error.toLowerCase();

    const links = [];

    // Provider-specific dashboard links
    if (provider === 'openai') {
      links.push({
        label: 'OpenAI API Dashboard',
        url: 'https://platform.openai.com/account/api-keys'
      });
      if (errorLower.includes('quota') || errorLower.includes('403')) {
        links.push({
          label: 'Check Usage & Billing',
          url: 'https://platform.openai.com/usage'
        });
      }
    } else if (provider === 'anthropic') {
      links.push({
        label: 'Anthropic Console',
        url: 'https://console.anthropic.com/settings/keys'
      });
    } else if (provider === 'gemini') {
      links.push({
        label: 'Google AI Studio',
        url: 'https://aistudio.google.com/app/apikey'
      });
    }

    return links;
  };

  const troubleshootingLinks = getTroubleshootingLinks();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h3 className="font-bold text-lg text-red-700 dark:text-red-300">
              Enhancement Failed
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
          >
            <X size={20} className="text-red-600 dark:text-red-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            To use the enhancement feature, you need to configure your AI provider API key in the settings.
          </p>

          {/* Troubleshooting Links */}
          {troubleshootingLinks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Helpful Resources:
              </p>
              <div className="space-y-1">
                {troubleshootingLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                  >
                    <ExternalLink size={14} />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleOpenSettings}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2"
            >
              <Settings size={16} />
              Open Settings
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
