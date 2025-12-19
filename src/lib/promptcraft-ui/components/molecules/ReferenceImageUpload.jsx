import React, { useState } from 'react';
import { Image as ImageIcon, X, Upload, AlertCircle, Plus } from 'lucide-react';
import { FileDropZone } from './FileDropZone';
import { SectionHeader } from './SectionHeader';

// Provider-specific maximum reference image limits
const PROVIDER_LIMITS = {
  google: 14, // Gemini: 6 objects + 5 humans + 3 other
  openai: 10, // GPT Image models support multiple
  grok: 1, // Single reference image
  a1111: 1, // Single init image
  comfyui: 14, // Flexible, set to match Gemini
};

/**
 * ReferenceImageUpload - Component for uploading and managing multiple reference images
 * for img2img and image-conditioned generation
 *
 * @param {Array} referenceImages - Array of current reference image data objects
 * @param {Function} onImagesChange - Callback when images are added/removed (receives array)
 * @param {boolean} showAdvancedControls - Whether to show the advanced controls section
 * @param {string} provider - Current provider (for conditional control display and limits)
 * @param {Function} onParamsChange - Callback when advanced params change
 */
export const ReferenceImageUpload = ({
  referenceImages = [],
  onImagesChange,
  showAdvancedControls = false,
  provider,
  onParamsChange
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Maximum file size: 10MB (base64 will be ~33% larger)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  // Get max images for current provider
  const maxImages = PROVIDER_LIMITS[provider] || 1;
  const canAddMore = referenceImages.length < maxImages;

  const handleFileSelect = async (file) => {
    if (!canAddMore) {
      setError(`Maximum of ${maxImages} reference image${maxImages > 1 ? 's' : ''} allowed for ${provider}`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload PNG, JPEG, or WebP images.');
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum of 10MB. Please resize your image.`);
      }

      // Warn for large files (>5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.warn(`⚠️ Large file detected (${(file.size / 1024 / 1024).toFixed(1)}MB). Consider resizing for better performance.`);
      }

      // Convert to base64 data URL
      const reader = new FileReader();

      reader.onloadend = () => {
        const imageData = {
          id: `ref-img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          data: reader.result, // Full data URL: "data:image/png;base64,..."
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        };

        console.log('🖼️ Reference image loaded:', {
          fileName: imageData.fileName,
          size: `${(imageData.fileSize / 1024).toFixed(1)}KB`,
          type: imageData.mimeType
        });

        // Add to array
        onImagesChange([...referenceImages, imageData]);
        setIsLoading(false);
      };

      reader.onerror = () => {
        throw new Error('Failed to read file. Please try again.');
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error('❌ Error loading reference image:', err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleRemove = (imageId) => {
    setError(null);
    onImagesChange(referenceImages.filter(img => img.id !== imageId));
  };

  const handleClearAll = () => {
    setError(null);
    onImagesChange([]);
  };

  // Shared parameters across all images (for now - could be per-image later)
  const sharedParams = {
    strength: 0.75,
    denoisingStrength: 0.7,
    resizeMode: 'crop',
    controlnetType: null,
    controlnetStrength: 1.0,
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
      <SectionHeader
        icon={ImageIcon}
        title={`Reference Images (${referenceImages.length}/${maxImages})`}
        extra={referenceImages.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Clear All
          </button>
        )}
      />

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Image Gallery */}
      {referenceImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {referenceImages.map((image, index) => (
            <div key={image.id} className="relative group">
              <div className="aspect-square rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-900">
                <img
                  src={image.data}
                  alt={image.fileName}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Image number badge */}
              <div className="absolute top-2 left-2 bg-indigo-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {index + 1}
              </div>

              {/* Remove button */}
              <button
                onClick={() => handleRemove(image.id)}
                className="absolute top-2 right-2 p-1.5 bg-red-500/90 hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove image"
              >
                <X size={14} className="text-white" />
              </button>

              {/* File info on hover */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="truncate">{image.fileName}</div>
                <div className="text-gray-300">{(image.fileSize / 1024).toFixed(1)} KB</div>
              </div>
            </div>
          ))}

          {/* Add More Button */}
          {canAddMore && (
            <div
              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center cursor-pointer transition-colors"
              onClick={() => document.getElementById('add-more-input')?.click()}
            >
              <Plus size={24} className="text-gray-400 mb-2" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Add More</span>
              <input
                id="add-more-input"
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileSelect(file);
                    e.target.value = ''; // Reset input
                  }
                }}
                className="hidden"
              />
            </div>
          )}
        </div>
      )}

      {/* Initial Upload Zone */}
      {referenceImages.length === 0 && (
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 rounded-lg z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Loading image...</p>
              </div>
            </div>
          )}
          <FileDropZone
            onFileSelect={handleFileSelect}
            acceptedFormats=".png,.jpg,.jpeg,.webp"
          />
        </div>
      )}

      {/* Provider-specific hint */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {maxImages === 1 && `${provider} supports 1 reference image`}
        {maxImages > 1 && `${provider} supports up to ${maxImages} reference images`}
      </div>

      {/* Advanced Controls */}
      {showAdvancedControls && onParamsChange && referenceImages.length > 0 && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <ReferenceImageControls
            params={sharedParams}
            onChange={onParamsChange}
            provider={provider}
          />
        </div>
      )}
    </div>
  );
};

/**
 * ReferenceImageControls - Advanced parameter controls for reference images
 * Conditionally shows controls based on provider capabilities
 */
const ReferenceImageControls = ({ params, onChange, provider }) => {
  const isComfyUI = provider === 'comfyui';
  const isA1111 = provider === 'a1111';
  const isLocalTool = isComfyUI || isA1111;

  return (
    <div className="space-y-4">
      {/* Strength Slider - All providers */}
      <div>
        <label className="flex items-center justify-between text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          <span>Influence Strength</span>
          <span className="text-indigo-500">{Math.round(params.strength * 100)}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={params.strength * 100}
          onChange={(e) => onChange({ strength: e.target.value / 100 })}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          How much the reference images influence the output
        </p>
      </div>

      {/* Denoising Strength - A1111/ComfyUI only */}
      {isLocalTool && (
        <div>
          <label className="flex items-center justify-between text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            <span>Denoising Strength</span>
            <span className="text-indigo-500">{Math.round(params.denoisingStrength * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={params.denoisingStrength * 100}
            onChange={(e) => onChange({ denoisingStrength: e.target.value / 100 })}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Higher values = more changes to the reference image
          </p>
        </div>
      )}

      {/* Resize Mode - A1111/ComfyUI only */}
      {isLocalTool && (
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Resize Mode
          </label>
          <select
            value={params.resizeMode}
            onChange={(e) => onChange({ resizeMode: e.target.value })}
            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200"
          >
            <option value="stretch">Stretch to fit</option>
            <option value="crop">Crop to fit</option>
            <option value="fill">Fill (preserve aspect ratio)</option>
          </select>
        </div>
      )}

      {/* ControlNet - ComfyUI only */}
      {isComfyUI && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              ControlNet Type
            </label>
            <select
              value={params.controlnetType || ''}
              onChange={(e) => onChange({ controlnetType: e.target.value || null })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200"
            >
              <option value="">None (Standard img2img)</option>
              <option value="canny">Canny Edge Detection</option>
              <option value="depth">Depth Map</option>
              <option value="openpose">OpenPose</option>
              <option value="scribble">Scribble</option>
              <option value="lineart">Line Art</option>
            </select>
          </div>

          {params.controlnetType && (
            <div>
              <label className="flex items-center justify-between text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span>ControlNet Strength</span>
                <span className="text-indigo-500">{Math.round(params.controlnetStrength * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={params.controlnetStrength * 100}
                onChange={(e) => onChange({ controlnetStrength: e.target.value / 100 })}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
