import React, { useState } from 'react';
import { Image as ImageIcon, X, Upload, AlertCircle } from 'lucide-react';
import { FileDropZone } from './FileDropZone';
import { SectionHeader } from './SectionHeader';

/**
 * ReferenceImageUpload - Component for uploading and managing reference images
 * for img2img and image-conditioned generation
 *
 * @param {Object} referenceImage - Current reference image data object
 * @param {Function} onImageSelect - Callback when image is selected (receives full image data object)
 * @param {Function} onImageRemove - Callback when image is removed
 * @param {boolean} showAdvancedControls - Whether to show the advanced controls section
 * @param {string} provider - Current provider (for conditional control display)
 * @param {Function} onParamsChange - Callback when advanced params change
 */
export const ReferenceImageUpload = ({
  referenceImage,
  onImageSelect,
  onImageRemove,
  showAdvancedControls = false,
  provider,
  onParamsChange
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Maximum file size: 10MB (base64 will be ~33% larger)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const handleFileSelect = async (file) => {
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
          data: reader.result, // Full data URL: "data:image/png;base64,..."
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,

          // Default parameters
          strength: 0.75,
          denoisingStrength: 0.7,
          resizeMode: 'crop', // 'stretch' | 'crop' | 'fill'

          // ComfyUI ControlNet params
          controlnetType: null, // null | 'canny' | 'depth' | 'openpose' | 'scribble'
          controlnetStrength: 1.0,
        };

        console.log('🖼️ Reference image loaded:', {
          fileName: imageData.fileName,
          size: `${(imageData.fileSize / 1024).toFixed(1)}KB`,
          type: imageData.mimeType
        });

        onImageSelect(imageData);
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

  const handleRemove = () => {
    setError(null);
    onImageRemove();
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
      <SectionHeader
        icon={ImageIcon}
        title="Reference Image (Optional)"
        extra={referenceImage && (
          <button
            onClick={handleRemove}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Remove
          </button>
        )}
      />

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {referenceImage ? (
        <div className="space-y-3">
          {/* Image Preview */}
          <div className="relative group">
            <img
              src={referenceImage.data}
              alt={referenceImage.fileName}
              className="w-full max-h-64 object-contain rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
            />
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 bg-red-500/90 hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove image"
            >
              <X size={16} className="text-white" />
            </button>
          </div>

          {/* File Info */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="truncate flex-1">{referenceImage.fileName}</span>
            <span className="ml-2 flex-shrink-0">
              {(referenceImage.fileSize / 1024).toFixed(1)} KB
            </span>
          </div>

          {/* Advanced Controls */}
          {showAdvancedControls && onParamsChange && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <ReferenceImageControls
                params={referenceImage}
                onChange={onParamsChange}
                provider={provider}
              />
            </div>
          )}
        </div>
      ) : (
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
          How much the reference image influences the output
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
