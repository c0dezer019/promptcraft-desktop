import React, { useState } from 'react';
import { X, Film, ChevronUp, ChevronDown, Check } from 'lucide-react';

/**
 * CreateSequenceDialog - Modal for creating/managing sequences
 * Allows selecting scenes and ordering them
 */
export function CreateSequenceDialog({ scenes, currentScene, onClose, onCreateSequence }) {
  const [selectedScenes, setSelectedScenes] = useState(currentScene ? [currentScene.id] : []);
  const [creating, setCreating] = useState(false);

  // Filter to same category as current scene
  const availableScenes = scenes.filter(s =>
    !currentScene || s.data?.category === currentScene.data?.category
  );

  const toggleScene = (sceneId) => {
    setSelectedScenes(prev =>
      prev.includes(sceneId)
        ? prev.filter(id => id !== sceneId)
        : [...prev, sceneId]
    );
  };

  const moveScene = (index, direction) => {
    const newOrder = [...selectedScenes];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newOrder.length) return;

    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    setSelectedScenes(newOrder);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await onCreateSequence(selectedScenes);
      onClose();
    } catch (err) {
      console.error('Failed to create sequence:', err);
      alert('Failed to create sequence: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Film className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Sequence</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-2 gap-6 p-6 max-h-[70vh]">
          {/* Available Scenes */}
          <div className="space-y-3 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Available Scenes ({availableScenes.length})
            </h3>
            <div className="space-y-2">
              {availableScenes.map(scene => (
                <button
                  key={scene.id}
                  onClick={() => toggleScene(scene.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                    selectedScenes.includes(scene.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedScenes.includes(scene.id)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selectedScenes.includes(scene.id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  {scene.thumbnail && (
                    <img
                      src={scene.thumbnail}
                      alt={scene.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}
                  <span className="flex-1 text-left text-sm text-gray-900 dark:text-white truncate">
                    {scene.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sequence Order */}
          <div className="space-y-3 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Sequence Order ({selectedScenes.length})
            </h3>
            {selectedScenes.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select scenes to add to sequence</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedScenes.map((sceneId, index) => {
                  const scene = scenes.find(s => s.id === sceneId);
                  if (!scene) return null;

                  return (
                    <div
                      key={sceneId}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveScene(index, -1)}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveScene(index, 1)}
                          disabled={index === selectedScenes.length - 1}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 w-6">
                        #{index}
                      </span>
                      {scene.thumbnail && (
                        <img
                          src={scene.thumbnail}
                          alt={scene.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      <span className="flex-1 text-sm text-gray-900 dark:text-white truncate">
                        {scene.name}
                      </span>
                      <button
                        onClick={() => toggleScene(sceneId)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
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
            disabled={creating || selectedScenes.length < 2}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {creating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Creating...
              </>
            ) : (
              <>
                <Film className="w-4 h-4" />
                Create Sequence ({selectedScenes.length})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
