import { Clock, Image, Video, Sparkles, Layers } from 'lucide-react';
import { getModelById } from '../../../constants/models';
import { getSceneOutputs } from '../../../hooks/useScenes';

/**
 * OutputGrid - Display multiple outputs in a grid layout
 */
function OutputGrid({ outputs, maxVisible = 4 }) {
  const visible = outputs.slice(0, maxVisible);
  const remaining = outputs.length - maxVisible;

  return (
    <div className="grid grid-cols-2 gap-0.5 w-full h-full">
      {visible.map((output) => (
        <div key={output.id} className="relative w-full h-full">
          {output.type === 'video' ? (
            <video
              src={output.url}
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={output.url}
              alt={`Output ${output.order + 1}`}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div className="flex items-center justify-center bg-black/60 text-white">
          <span className="text-lg font-semibold">+{remaining}</span>
        </div>
      )}
    </div>
  );
}

/**
 * SceneCard - Tiled card component for displaying scene thumbnails in grid
 * Shows: thumbnail, title, model, size, generation count
 * Supports multi-output display (comic panel style)
 */
export function SceneCard({ scene, onClick }) {
  const { name, data, thumbnail, created_at } = scene;
  const { category, model, metadata, jobs = [] } = data || {};

  // Get outputs (handles both new multi-output and legacy single-thumbnail)
  const outputs = getSceneOutputs(scene);
  const hasMultipleOutputs = outputs.length > 1;

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Get display icon based on category
  const CategoryIcon = category === 'video' ? Video : Image;

  // Extract image size from metadata or jobs
  const getImageSize = () => {
    if (metadata?.size) return metadata.size;
    if (data?.prompt?.params?.size) return data.prompt.params.size;
    return null;
  };

  const imageSize = getImageSize();
  const jobCount = Array.isArray(jobs) ? jobs.length : 0;

  // Get model display name
  const modelInfo = model ? getModelById(model) : null;
  const modelDisplayName = modelInfo?.name || model || 'Unknown';

  return (
    <div
      onClick={() => onClick(scene)}
      className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
    >
      {/* Thumbnail Image / Multi-Output Grid */}
      {outputs.length > 0 ? (
        hasMultipleOutputs ? (
          <OutputGrid outputs={outputs} maxVisible={4} />
        ) : (
          <img
            src={outputs[0].url}
            alt={name}
            className="w-full h-full object-cover"
          />
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900">
          <CategoryIcon className="w-16 h-16 text-gray-400 dark:text-gray-600" />
        </div>
      )}

      {/* Gradient Overlay (visible on hover or always) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Bottom Info Overlay (always visible) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
        {/* Scene Title */}
        <h3 className="text-white font-semibold text-lg mb-1 truncate">
          {name}
        </h3>

        {/* Metadata Row */}
        <div className="flex items-center gap-3 text-white/80 text-sm">
          {/* Model Name */}
          <div className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {modelDisplayName}
            </span>
          </div>

          {/* Image Size */}
          {imageSize && (
            <div className="flex items-center gap-1">
              <CategoryIcon className="w-3.5 h-3.5" />
              <span>{imageSize}</span>
            </div>
          )}

          {/* Generation Count */}
          {jobCount > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                {jobCount} {jobCount === 1 ? 'gen' : 'gens'}
              </span>
            </div>
          )}
        </div>

        {/* Tags (visible on hover) */}
        {metadata?.tags && metadata.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {metadata.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-xs bg-indigo-500/80 text-white px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
            {metadata.tags.length > 3 && (
              <span className="text-xs bg-gray-500/80 text-white px-2 py-0.5 rounded-full">
                +{metadata.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Top Right Info (Date) - visible on hover */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-1.5 bg-black/60 text-white text-xs px-2.5 py-1.5 rounded-lg backdrop-blur-sm">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatDate(created_at)}</span>
        </div>
      </div>

      {/* Variation Badge (if scene has variations) */}
      {metadata?.variationOf && (
        <div className="absolute top-3 left-3">
          <div className="bg-purple-500/90 text-white text-xs px-2.5 py-1 rounded-lg backdrop-blur-sm font-medium">
            Variation
          </div>
        </div>
      )}

      {/* Sequence Badge (if scene is part of sequence) */}
      {metadata?.sequenceId && (
        <div className="absolute top-3 left-3">
          <div className="bg-blue-500/90 text-white text-xs px-2.5 py-1 rounded-lg backdrop-blur-sm font-medium max-w-[200px] truncate">
            {metadata.sequenceName || `Sequence #${metadata.sequenceOrder !== undefined ? metadata.sequenceOrder + 1 : '?'}`}
          </div>
        </div>
      )}

      {/* Multi-Output Badge (if scene has multiple outputs) */}
      {hasMultipleOutputs && !metadata?.variationOf && !metadata?.sequenceId && (
        <div className="absolute top-3 left-3">
          <div className="flex items-center gap-1.5 bg-green-500/90 text-white text-xs px-2.5 py-1 rounded-lg backdrop-blur-sm font-medium">
            <Layers className="w-3.5 h-3.5" />
            <span>{outputs.length} outputs</span>
          </div>
        </div>
      )}
    </div>
  );
}
