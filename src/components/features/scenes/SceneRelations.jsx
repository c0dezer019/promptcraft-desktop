import React from 'react';
import { ChevronRight, GitBranch, Film } from 'lucide-react';

/**
 * SceneRelations - Displays variations and sequential images for a scene
 * Similar to CivitAI's "Similar Images" section but organized by relationship type
 */
export function SceneRelations({ scene, allScenes, onSceneClick }) {
  const { id, data } = scene;
  const { metadata } = data || {};

  // Find variations (scenes that have this scene as variationOf)
  const variations = allScenes.filter(s =>
    s.data?.metadata?.variationOf === id
  );

  // Find parent variation (if this is a variation)
  const parentVariation = metadata?.variationOf
    ? allScenes.find(s => s.id === metadata.variationOf)
    : null;

  // Find sibling variations (other variations of the same parent)
  const siblingVariations = parentVariation
    ? allScenes.filter(s =>
        s.data?.metadata?.variationOf === metadata.variationOf &&
        s.id !== id
      )
    : [];

  // Find sequential scenes (same sequenceId)
  const sequentialScenes = metadata?.sequenceId
    ? allScenes.filter(s =>
        s.data?.metadata?.sequenceId === metadata.sequenceId &&
        s.id !== id
      ).sort((a, b) =>
        (a.data?.metadata?.sequenceOrder || 0) - (b.data?.metadata?.sequenceOrder || 0)
      )
    : [];

  const hasRelations = variations.length > 0 || parentVariation || siblingVariations.length > 0 || sequentialScenes.length > 0;

  if (!hasRelations) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
      {/* Parent Variation */}
      {parentVariation && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Original Scene
            </h3>
          </div>
          <SceneThumbnailRow scenes={[parentVariation]} onSceneClick={onSceneClick} />
        </div>
      )}

      {/* Sibling Variations */}
      {siblingVariations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Other Variations
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({siblingVariations.length})
            </span>
          </div>
          <SceneThumbnailRow scenes={siblingVariations} onSceneClick={onSceneClick} />
        </div>
      )}

      {/* Variations */}
      {variations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Variations
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({variations.length})
            </span>
          </div>
          <SceneThumbnailRow scenes={variations} onSceneClick={onSceneClick} />
        </div>
      )}

      {/* Sequential Scenes */}
      {sequentialScenes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sequence Timeline
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({sequentialScenes.length + 1} scenes)
            </span>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {sequentialScenes.map((seq, index) => {
              const currentOrder = metadata.sequenceOrder || 0;
              const seqOrder = seq.data?.metadata?.sequenceOrder || 0;
              const isCurrent = seq.id === id;
              const isBefore = seqOrder < currentOrder;

              return (
                <React.Fragment key={seq.id}>
                  {index === 0 && isBefore && (
                    <div className="flex-shrink-0">
                      <SequenceThumbnail scene={scene} isCurrent={true} onClick={onSceneClick} />
                    </div>
                  )}
                  <div className="flex-shrink-0">
                    <SequenceThumbnail scene={seq} onClick={onSceneClick} />
                  </div>
                  {!isBefore && index === sequentialScenes.findIndex(s => (s.data?.metadata?.sequenceOrder || 0) >= currentOrder) && (
                    <>
                      <ChevronRight className="flex-shrink-0 w-5 h-5 text-gray-400" />
                      <div className="flex-shrink-0">
                        <SequenceThumbnail scene={scene} isCurrent={true} onClick={onSceneClick} />
                      </div>
                    </>
                  )}
                  {index < sequentialScenes.length - 1 && (
                    <ChevronRight className="flex-shrink-0 w-5 h-5 text-gray-400" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * SceneThumbnailRow - Horizontal scrollable row of scene thumbnails
 */
function SceneThumbnailRow({ scenes, onSceneClick }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {scenes.map(scene => (
        <button
          key={scene.id}
          onClick={() => onSceneClick(scene)}
          className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 hover:ring-2 hover:ring-indigo-500 transition-all group"
        >
          {scene.thumbnail ? (
            <img
              src={scene.thumbnail}
              alt={scene.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
              <span className="text-xs text-gray-500 dark:text-gray-400 text-center px-2">
                {scene.name}
              </span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * SequenceThumbnail - Thumbnail for sequential scenes with order badge
 */
function SequenceThumbnail({ scene, isCurrent, onClick }) {
  const order = scene.data?.metadata?.sequenceOrder;

  return (
    <button
      onClick={() => onClick(scene)}
      className={`relative w-32 h-32 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 transition-all ${
        isCurrent
          ? 'ring-2 ring-indigo-600 dark:ring-indigo-400'
          : 'hover:ring-2 hover:ring-indigo-500'
      }`}
    >
      {scene.thumbnail ? (
        <img
          src={scene.thumbnail}
          alt={scene.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
          <span className="text-xs text-gray-500 dark:text-gray-400 text-center px-2">
            {scene.name}
          </span>
        </div>
      )}

      {/* Order Badge */}
      {order !== undefined && (
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm font-semibold">
          #{order}
        </div>
      )}

      {/* Current Badge */}
      {isCurrent && (
        <div className="absolute bottom-2 left-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm font-semibold">
          Current
        </div>
      )}
    </button>
  );
}
