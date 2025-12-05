import React, { useState } from 'react';
import { X, Upload, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import { callAI } from '@promptcraft/ui/utils/aiApi.js';

/**
 * ImageAnalysis Component - Analyze images and generate prompts
 *
 * @param {boolean} isOpen - Whether modal is open
 * @param {function} onClose - Close handler
 * @param {function} onGeneratePrompt - Callback when prompt is generated
 */
export const ImageAnalysis = ({ isOpen, onClose, onGeneratePrompt }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  if (!isOpen) return null;

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setAnalyzing(true);
    try {
      // Placeholder for image analysis
      const prompt = "A detailed description of the image would go here after analysis.";
      setGeneratedPrompt(prompt);
    } catch (error) {
      console.error('Image analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUsePrompt = () => {
    if (generatedPrompt && onGeneratePrompt) {
      onGeneratePrompt(generatedPrompt);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setGeneratedPrompt('');
    setAnalyzing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-6 h-6 text-indigo-500" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              Image Analysis
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Upload Section */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            {imagePreview ? (
              <div className="space-y-4">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-64 mx-auto rounded-lg"
                />
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                    setGeneratedPrompt('');
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Change Image
                </button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Click to upload an image for analysis
                </p>
              </label>
            )}
          </div>

          {/* Analyze Button */}
          {selectedImage && !generatedPrompt && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Analyze Image
                </>
              )}
            </button>
          )}

          {/* Generated Prompt */}
          {generatedPrompt && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Generated Prompt
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {generatedPrompt}
                </p>
              </div>
              <button
                onClick={handleUsePrompt}
                className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
              >
                Use This Prompt
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
