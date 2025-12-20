import React, { useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';

/**
 * Sortable output card for drag-and-drop reordering
 */
function SortableOutputCard({ output, onRemove, editable }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: output.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      {/* Drag handle - only show in editable mode */}
      {editable && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 z-10 bg-black/60 text-white p-1 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Remove button - only show in editable mode */}
      {editable && onRemove && (
        <button
          onClick={() => onRemove(output.id)}
          className="absolute top-2 right-2 z-10 bg-red-500/80 hover:bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Output image/video */}
      {output.type === 'video' ? (
        <video
          src={output.url}
          className="w-full h-full object-cover rounded"
          controls={editable}
        />
      ) : (
        <img
          src={output.url}
          alt={`Output ${output.order + 1}`}
          loading="lazy"
          className="w-full h-full object-cover rounded"
        />
      )}

      {/* Output order indicator */}
      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
        #{output.order + 1}
      </div>
    </div>
  );
}

/**
 * Static gallery (no drag-and-drop)
 */
function StaticGallery({ outputs, onRemove }) {
  const gridCols = outputs.length === 1 ? 'grid-cols-1' :
                   outputs.length === 2 ? 'grid-cols-2' :
                   outputs.length === 3 ? 'grid-cols-3' :
                   'grid-cols-2';

  return (
    <div className={`grid ${gridCols} gap-2`}>
      {outputs.map(output => (
        <div key={output.id} className="relative group">
          {onRemove && (
            <button
              onClick={() => onRemove(output.id)}
              className="absolute top-2 right-2 z-10 bg-red-500/80 hover:bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {output.type === 'video' ? (
            <video
              src={output.url}
              className="w-full h-full object-cover rounded"
              controls
            />
          ) : (
            <img
              src={output.url}
              alt={`Output ${output.order + 1}`}
              loading="lazy"
              className="w-full h-full object-cover rounded"
            />
          )}

          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
            #{output.order + 1}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * SceneOutputsGallery - Display and manage scene outputs
 *
 * @param {Array} outputs - Array of output objects
 * @param {string} category - 'image' or 'video'
 * @param {string} layout - 'grid' | 'carousel' | 'single'
 * @param {boolean} editable - Enable drag-to-reorder and remove
 * @param {Function} onReorder - Callback when outputs are reordered
 * @param {Function} onRemove - Callback when output is removed
 */
export default function SceneOutputsGallery({
  outputs = [],
  category = 'image',
  layout = 'grid',
  editable = false,
  onReorder = null,
  onRemove = null,
}) {
  const [localOutputs, setLocalOutputs] = useState(outputs);

  // Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = localOutputs.findIndex(o => o.id === active.id);
      const newIndex = localOutputs.findIndex(o => o.id === over.id);

      const reordered = arrayMove(localOutputs, oldIndex, newIndex).map((o, i) => ({
        ...o,
        order: i
      }));

      setLocalOutputs(reordered);

      if (onReorder) {
        onReorder(reordered);
      }
    }
  };

  // Handle output removal
  const handleRemove = (outputId) => {
    const filtered = localOutputs
      .filter(o => o.id !== outputId)
      .map((o, i) => ({ ...o, order: i }));

    setLocalOutputs(filtered);

    if (onRemove) {
      onRemove(outputId, filtered);
    }
  };

  // Empty state
  if (!outputs || outputs.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-800/30 rounded-lg border border-gray-700/50">
        <p className="text-gray-500">No outputs available</p>
      </div>
    );
  }

  // Single layout - show one output
  if (layout === 'single') {
    const output = localOutputs[0];
    return (
      <div className="w-full">
        {output.type === 'video' ? (
          <video
            src={output.url}
            className="w-full rounded-lg"
            controls
          />
        ) : (
          <img
            src={output.url}
            alt="Output"
            loading="lazy"
            className="w-full rounded-lg"
          />
        )}
      </div>
    );
  }

  // Grid layout with drag-and-drop (if editable)
  if (!editable || !onReorder) {
    return <StaticGallery outputs={localOutputs} onRemove={onRemove ? handleRemove : null} />;
  }

  // Determine grid columns based on output count
  const gridCols = localOutputs.length === 1 ? 'grid-cols-1' :
                   localOutputs.length === 2 ? 'grid-cols-2' :
                   localOutputs.length === 3 ? 'grid-cols-3' :
                   'grid-cols-2';

  return (
    <DndContext
      onDragEnd={handleDragEnd}
      collisionDetection={closestCenter}
    >
      <SortableContext items={localOutputs.map(o => o.id)}>
        <div className={`grid ${gridCols} gap-2`}>
          {localOutputs.map(output => (
            <SortableOutputCard
              key={output.id}
              output={output}
              onRemove={handleRemove}
              editable={editable}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
