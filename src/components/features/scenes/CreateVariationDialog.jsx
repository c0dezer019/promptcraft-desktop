import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

/**
 * CreateVariationDialog - Modal for creating a variation of a scene
 * Allows user to modify prompt before generating
 */
export function CreateVariationDialog({ parentScene, onClose, onCreateVariation }) {
  const [variationName, setVariationName] = useState(`${parentScene.name} - Variation`);
  const [mainPrompt, setMainPrompt] = useState(parentScene.data?.prompt?.main || '');
  const [negativePrompt, setNegativePrompt] = useState(parentScene.data?.prompt?.negative || '');
  const [notes, setNotes] = useState('');
  const [useAsReference, setUseAsReference] = useState(true); // Default to true
  const [creating, setCreating] = useState(false);

  // Determine if this is a local model (ComfyUI, A1111, InvokeAI) that supports negative prompts
  // Cloud models (OpenAI, Google, Grok, etc.) don't use negative prompts
  const modelId = parentScene.data?.model || '';
  const isLocalModel = modelId.includes('comfyui') || modelId.includes('a1111') || modelId.includes('invokeai');
  const supportsNegativePrompt = isLocalModel;

  const handleCreate = async () => {
    setCreating(true);
    try {
      const promptData = {
        main: mainPrompt,
      };

      // Only include negative prompt for local models that support it
      if (supportsNegativePrompt && negativePrompt) {
        promptData.negative = negativePrompt;
      }

      await onCreateVariation({
        name: variationName,
        prompt: promptData,
        useAsReference,
        metadata: {
          notes: notes || undefined,
        },
      });
      onClose();
    } catch (err) {
      console.error('Failed to create variation:', err);
      alert('Failed to create variation: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Variation</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Parent Scene Preview */}
          <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            {parentScene.thumbnail && (
              <img
                src={parentScene.thumbnail}
                alt={parentScene.name}
                className="w-24 h-24 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Creating variation of:</p>
              <p className="font-semibold text-gray-900 dark:text-white">{parentScene.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Modify the prompt below to create a different version
              </p>
            </div>
          </div>

          {/* Use as Reference Option */}
          {parentScene.thumbnail && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <input
                type="checkbox"
                id="useAsReference"
                checked={useAsReference}
                onChange={(e) => setUseAsReference(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="useAsReference" className="flex-1 cursor-pointer">
                <div className="font-medium text-gray-900 dark:text-white">
                  Use original as reference image
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Guide the generation with the parent image's composition and style
                </div>
              </label>
            </div>
          )}

          {/* Variation Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Variation Name
            </label>
            <input
              type="text"
              value={variationName}
              onChange={(e) => setVariationName(e.target.value)}
              placeholder="e.g., Dragon Scene - Blue Variant"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Main Prompt */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Main Prompt
            </label>
            <textarea
              value={mainPrompt}
              onChange={(e) => setMainPrompt(e.target.value)}
              rows={6}
              placeholder="Modify the prompt for this variation..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tip: Change colors, styles, or elements to create a variation
            </p>
          </div>

          {/* Negative Prompt - Only for local models */}
          {supportsNegativePrompt && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Negative Prompt (Optional)
              </label>
              <textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                rows={3}
                placeholder="Things to avoid in generation..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Why you created this variation..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={onClose}
            disabled={creating}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !variationName || !mainPrompt}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {creating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Create & Generate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
