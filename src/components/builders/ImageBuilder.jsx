import React, { useState, useMemo } from 'react';
import { Image, Sparkles, MinusCircle, Loader2, CheckCircle2, XCircle, Zap, ExternalLink } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { TextArea, Select } from '../../lib/promptcraft-ui/components/atoms/Input.jsx';
import { SectionHeader } from '../../lib/promptcraft-ui/components/molecules/SectionHeader.jsx';
import { TagGroup } from '../../lib/promptcraft-ui/components/molecules/TagGroup.jsx';
import { EnhanceButton } from '../../lib/promptcraft-ui/components/molecules/EnhanceButton.jsx';
import { ReferenceImageUpload } from '../../lib/promptcraft-ui/components/molecules/ReferenceImageUpload.jsx';
import { SD_CATEGORIES } from '../../lib/promptcraft-ui/constants/tagCategories.js';
import { callAI } from '../../utils/aiApi.js';
import { useGeneration } from '../../lib/promptcraft-ui/hooks/useGeneration.js';
import { useJobPolling } from '../../lib/promptcraft-ui/hooks/useJobPolling.js';
import { usePlatform } from '../../lib/promptcraft-ui/hooks/usePlatform.js';
import { useProviders } from '../../hooks/useProviders.js';
import { getModelById, getModelProvider } from '../../constants/models.js';
import { EnhancementErrorModal } from '../EnhancementErrorModal.jsx';

// Import specialized builders
import { GrokBuilder } from '../GrokBuilder.jsx';
import { MidjourneyBuilder } from '../MidjourneyBuilder.jsx';

/**
 * ImageBuilder Component - Unified image generation interface
 * Supports DALL-E, Grok/Aurora, ComfyUI, A1111, and Midjourney
 *
 * @param {string} model - Model ID (e.g., 'gpt-image-1-mini', 'grok-2-image', 'comfy', 'a1111', 'midjourney')
 * @param {string} prompt - Main prompt text
 * @param {function} setPrompt - Prompt setter
 * @param {Array} modifiers - Modifier tags (for SD-based models)
 * @param {function} setModifiers - Modifiers setter
 * @param {string} negativePrompt - Negative prompt (for SD-based models)
 * @param {function} setNegativePrompt - Negative prompt setter
 * @param {Array} nodes - ComfyUI nodes
 * @param {function} setNodes - Nodes setter
 * @param {Object} params - Model-specific parameters
 * @param {function} setParams - Params setter
 * @param {function} deleteEnhancer - Function to delete an enhancer
 * @param {function} editEnhancer - Function to edit an enhancer
 * @param {function} syncEnhancer - Function to sync enhancer across builders
 * @param {string} workflowId - Current workflow ID (optional, for generation)
 * @param {function} onOpenSettings - Function to open settings modal
 */
export const ImageBuilder = ({
  model,
  prompt,
  setPrompt,
  modifiers = [],
  setModifiers,
  negativePrompt = '',
  setNegativePrompt,
  nodes = [],
  setNodes,
  params = {},
  setParams,
  deleteEnhancer,
  editEnhancer,
  syncEnhancer,
  workflowId = 'default',
  onOpenSettings
}) => {
  // Route to specialized builders for Grok and Midjourney
  if (model === 'grok-2-image' || model === 'aurora') {
    return (
      <GrokBuilder
        prompt={prompt}
        setPrompt={setPrompt}
        workflowId={workflowId}
        onOpenSettings={onOpenSettings}
      />
    );
  }

  if (model === 'midjourney') {
    return (
      <MidjourneyBuilder
        prompt={prompt}
        setPrompt={setPrompt}
        modifiers={modifiers}
        setModifiers={setModifiers}
        deleteEnhancer={deleteEnhancer}
        editEnhancer={editEnhancer}
        syncEnhancer={syncEnhancer}
        onOpenSettings={onOpenSettings}
      />
    );
  }

  // Standard ImageBuilder for DALL-E, ComfyUI, and A1111
  return (
    <StandardImageBuilder
      model={model}
      prompt={prompt}
      setPrompt={setPrompt}
      modifiers={modifiers}
      setModifiers={setModifiers}
      negativePrompt={negativePrompt}
      setNegativePrompt={setNegativePrompt}
      nodes={nodes}
      setNodes={setNodes}
      params={params}
      setParams={setParams}
      deleteEnhancer={deleteEnhancer}
      editEnhancer={editEnhancer}
      syncEnhancer={syncEnhancer}
      workflowId={workflowId}
      onOpenSettings={onOpenSettings}
    />
  );
};

/**
 * StandardImageBuilder - Handles DALL-E, ComfyUI, and A1111 models
 */
const StandardImageBuilder = ({
  model,
  prompt,
  setPrompt,
  modifiers,
  setModifiers,
  negativePrompt,
  setNegativePrompt,
  nodes,
  setNodes,
  params,
  setParams,
  deleteEnhancer,
  editEnhancer,
  syncEnhancer,
  workflowId,
  onOpenSettings
}) => {
  const modelConfig = getModelById(model);
  const provider = getModelProvider(model);
  const modelName = modelConfig?.name || model;
  const isOpenAIImage = provider === 'openai';
  const isGoogleImage = provider === 'google';
  const isComfy = model === 'comfy';
  const isA1111 = model === 'a1111';
  const isSDModel = isComfy || isA1111;

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [categories, setCategories] = useState(SD_CATEGORIES);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [enhancementError, setEnhancementError] = useState('');

  // Generation hooks
  const { generate, generating, error, latestJob, jobs, loadJobs } = useGeneration(workflowId);
  const { getProviderDisplayName } = useProviders();
  const [localError, setLocalError] = useState(null);

  // Auto-poll for job status updates
  useJobPolling(loadJobs, jobs || []);

  // OpenAI Image Model (GPT-Image) specific parameters
  const [size, setSize] = useState('1024x1024');
  const [quality, setQuality] = useState('standard');
  const [style, setStyle] = useState('vivid');

  // Google Gemini specific parameters
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [numImages, setNumImages] = useState(1);

  // A1111 specific parameters
  const [steps, setSteps] = useState(params.steps || 20);
  const [cfgScale, setCfgScale] = useState(params.cfg_scale || 7);
  const [width, setWidth] = useState(params.width || 512);
  const [height, setHeight] = useState(params.height || 512);
  const [sampler, setSampler] = useState(params.sampler || 'Euler a');

  const handleEnhance = async () => {
    if (!prompt) return;
    setIsEnhancing(true);
    setLocalError(null);

    let systemPrompt;
    if (isOpenAIImage) {
      systemPrompt = "You are an expert prompt engineer for OpenAI's GPT Image models. Enhance the user's prompt by adding missing visual details ONLY where they are lacking. PRESERVE the original structure, format, and any existing specific details (dialogue, scene descriptions, character actions, etc.). If it's written as a script, keep it as a script. If it's a paragraph, keep it as a paragraph. Only add details about: composition, lighting, style, colors, or mood where not already specified. Do not remove or restructure existing content. Keep it under 150 words. Return ONLY the enhanced prompt.";
    } else if (isGoogleImage) {
      systemPrompt = "You are an expert prompt engineer for Google's Gemini image generation models. Enhance the user's prompt by adding missing visual details ONLY where they are lacking. PRESERVE the original structure, format, and any existing specific details. Focus on adding: visual clarity, composition details, lighting, style, and artistic elements where not specified. Keep descriptions natural and detailed. Do not remove or restructure existing content. Return ONLY the enhanced prompt.";
    } else if (isSDModel) {
      systemPrompt = "You are an expert prompt engineer for Stable Diffusion. Enhance the user's prompt by adding missing visual details ONLY where they are lacking. PRESERVE existing tags and descriptors. Only add: quality tags, artistic style, composition, lighting, or technical details where not specified. Do not remove or restructure existing content. Keep it concise. Return ONLY the enhanced prompt.";
    } else {
      systemPrompt = "You are an expert image prompt engineer. Enhance the user's prompt by adding missing visual details ONLY where they are lacking. PRESERVE the original structure, format, and any existing specific details (dialogue, scene descriptions, character actions, etc.). If it's written as a script, keep it as a script. If it's a paragraph, keep it as a paragraph. Only add details about: composition, style, lighting, or mood where not already specified. Do not remove or restructure existing content. Return ONLY the enhanced prompt.";
    }

    try {
      const result = await callAI(prompt, systemPrompt);
      setPrompt(result);
    } catch (error) {
      setEnhancementError(error.message || error.toString());
      setShowErrorModal(true);
      console.error('Enhancement error:', error);
    } finally {
      setIsEnhancing(false);
    }
  };

  const addModifier = (tag) => {
    if (!modifiers.includes(tag)) setModifiers([...modifiers, tag]);
  };

  const removeModifier = (tag) => {
    setModifiers(modifiers.filter(m => m !== tag));
  };

  const handleAddTag = (category, newTag) => {
    setCategories(prev => ({
      ...prev,
      [category]: [...prev[category], newTag]
    }));
  };

  const handleDeleteCategory = (category, tag, index) => {
    setCategories(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
  };

  const handleEditCategory = (category, oldTag, newTag, index) => {
    setCategories(prev => ({
      ...prev,
      [category]: prev[category].map((tag, i) => (i === index ? newTag : tag))
    }));
  };

  const handleSyncTag = (tag) => {
    if (syncEnhancer) {
      syncEnhancer(tag, 'image');
    }
  };

  const handleGenerate = async () => {
    if (!prompt || !prompt.trim()) {
      setLocalError('Please enter a prompt first');
      return;
    }

    setLocalError(null);

    // Build full prompt with modifiers (universal for all models)
    const fullPrompt = modifiers.length > 0
      ? prompt + ', ' + modifiers.join(', ')
      : prompt;

    // Build parameters based on model type
    let parameters = {};
    if (isOpenAIImage) {
      parameters = {
        size,
        quality,
        style,
        n: 1
      };
    } else if (isGoogleImage) {
      parameters = {
        aspect_ratio: aspectRatio,
        image_size: imageSize,
        n: numImages
      };
    } else if (isA1111) {
      parameters = {
        prompt: fullPrompt,
        negative_prompt: negativePrompt,
        steps,
        cfg_scale: cfgScale,
        width,
        height,
        sampler_name: sampler
      };
    } else if (isComfy) {
      parameters = {
        nodes: nodes,
        prompt: fullPrompt
      };
    }

    // Add reference image if present
    if (params.referenceImage) {
      parameters.reference_image = params.referenceImage;
    }

    await generate(provider, fullPrompt, model, parameters);
  };

  const getSizeOptions = () => {
    return modelConfig?.parameters?.size || ['1024x1024', '1024x1792', '1792x1024'];
  };

  const getQualityOptions = () => {
    return modelConfig?.parameters?.quality || ['standard', 'hd'];
  };

  const getStyleOptions = () => {
    return modelConfig?.parameters?.style || ['vivid', 'natural'];
  };

  const getAspectRatioOptions = () => {
    return modelConfig?.parameters?.aspect_ratio || ['1:1', '16:9', '9:16', '4:3', '3:4'];
  };

  const getImageSizeOptions = () => {
    return modelConfig?.parameters?.image_size || ['1K', '2K', '4K'];
  };

  const getNumImagesOptions = () => {
    return modelConfig?.parameters?.n || [1, 2, 4];
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Main Prompt Section */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 relative">
            <SectionHeader
              icon={Image}
              title={`Main ${modelConfig?.name || 'Image'} Prompt`}
              extra={
                <EnhanceButton
                  isEnhancing={isEnhancing}
                  disabled={!prompt}
                  onClick={handleEnhance}
                  variant="enhance"
                  label="Enhance"
                />
              }
            />
            <TextArea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={isSDModel ? "masterpiece, best quality, detailed..." : "Describe the image you want to create..."}
              rows={isSDModel ? 6 : 8}
            />

            {/* Active Modifiers Display - Universal for all models */}
            {modifiers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {modifiers.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 text-xs rounded-full flex items-center gap-1"
                  >
                    {tag}
                    <button
                      onClick={() => removeModifier(tag)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <MinusCircle size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Negative Prompt for SD models */}
          {isSDModel && (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <SectionHeader icon={MinusCircle} title="Negative Prompt" />
              <TextArea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="ugly, blurry, low quality..."
                rows={3}
              />
            </div>
          )}

          {/* Reference Image - Show for supported providers */}
          {(isSDModel || isGoogleImage) && (
            <ReferenceImageUpload
              referenceImage={params.referenceImage}
              onImageSelect={(imageData) => setParams({ ...params, referenceImage: imageData })}
              onImageRemove={() => setParams({ ...params, referenceImage: null })}
              showAdvancedControls={true}
              provider={provider}
              onParamsChange={(updates) => setParams({
                ...params,
                referenceImage: { ...params.referenceImage, ...updates }
              })}
            />
          )}

          {/* Parameters Section */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <SectionHeader icon={Sparkles} title="Parameters" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3">
              {isOpenAIImage && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Size</label>
                    <Select
                      className="mt-1"
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      options={getSizeOptions()}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Quality</label>
                    <Select
                      className="mt-1"
                      value={quality}
                      onChange={(e) => setQuality(e.target.value)}
                      options={getQualityOptions()}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Style</label>
                    <Select
                      className="mt-1"
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      options={getStyleOptions()}
                    />
                  </div>
                </>
              )}

              {isGoogleImage && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Aspect Ratio</label>
                    <Select
                      className="mt-1"
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value)}
                      options={getAspectRatioOptions()}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Image Size</label>
                    <Select
                      className="mt-1"
                      value={imageSize}
                      onChange={(e) => setImageSize(e.target.value)}
                      options={getImageSizeOptions()}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Number of Images</label>
                    <Select
                      className="mt-1"
                      value={numImages}
                      onChange={(e) => setNumImages(parseInt(e.target.value))}
                      options={getNumImagesOptions().map(n => n.toString())}
                    />
                  </div>
                </>
              )}

              {isA1111 && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Steps</label>
                    <input
                      type="number"
                      className="mt-1 w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                      value={steps}
                      onChange={(e) => setSteps(parseInt(e.target.value))}
                      min="1"
                      max="150"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">CFG Scale</label>
                    <input
                      type="number"
                      className="mt-1 w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                      value={cfgScale}
                      onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                      min="1"
                      max="30"
                      step="0.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Width</label>
                    <input
                      type="number"
                      className="mt-1 w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                      value={width}
                      onChange={(e) => setWidth(parseInt(e.target.value))}
                      step="64"
                      min="64"
                      max="2048"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Height</label>
                    <input
                      type="number"
                      className="mt-1 w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                      value={height}
                      onChange={(e) => setHeight(parseInt(e.target.value))}
                      step="64"
                      min="64"
                      max="2048"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Sampler</label>
                    <Select
                      className="mt-1"
                      value={sampler}
                      onChange={(e) => setSampler(e.target.value)}
                      options={['Euler a', 'Euler', 'DPM++ 2M Karras', 'DPM++ SDE Karras', 'DDIM']}
                    />
                  </div>
                </>
              )}

              {isComfy && (
                <div className="col-span-full">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    ComfyUI workflow builder coming soon. Use the prompt field for now.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Generation Button - Outside Parameters Container */}
          {!isComfy && (
            <div className="flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={generating || !prompt}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate with {modelName}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Enhancers Sidebar - Universal for all models */}
        <div className="space-y-2 h-full overflow-y-auto pr-2 custom-scrollbar">
          <SectionHeader icon={Sparkles} title="Enhancers" />
          {Object.entries(categories).map(([key, tags]) => (
            <TagGroup
              key={key}
              title={key.charAt(0).toUpperCase() + key.slice(1)}
              tags={tags}
              onSelect={addModifier}
              onAdd={(newTag) => handleAddTag(key, newTag)}
              onDelete={(tag, index) => handleDeleteCategory(key, tag, index)}
              onEdit={(oldTag, newTag, index) => handleEditCategory(key, oldTag, newTag, index)}
              onSync={handleSyncTag}
            />
          ))}
        </div>
      </div>

      {/* Generation Status & Results */}
      {!isComfy && (error || localError || latestJob) && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <SectionHeader icon={Zap} title="Generation Status" />

          <div className="space-y-4 mt-4">

            {/* Error Display */}
            {(error || localError) && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{error || localError}</p>
              </div>
            )}

            {/* Latest Job Status */}
            {latestJob && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-300">Latest Generation</span>
                  <StatusBadge status={latestJob.status} />
                </div>

                {latestJob.status === 'completed' && latestJob.result && (
                  <div className="mt-3">
                    <ResultDisplay result={latestJob.result} />
                  </div>
                )}

                {latestJob.status === 'failed' && latestJob.error && (
                  <div className="mt-2 text-sm text-red-300">
                    Error: {latestJob.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhancement Error Modal */}
      <EnhancementErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        onOpenSettings={onOpenSettings || (() => {})}
        error={enhancementError}
      />
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const config = {
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', icon: Loader2, label: 'Pending' },
    running: { bg: 'bg-blue-500/20', text: 'text-blue-300', icon: Loader2, label: 'Generating...', spin: true },
    completed: { bg: 'bg-green-500/20', text: 'text-green-300', icon: CheckCircle2, label: 'Completed' },
    failed: { bg: 'bg-red-500/20', text: 'text-red-300', icon: XCircle, label: 'Failed' },
  };

  const { bg, text, icon: Icon, label, spin } = config[status] || config.pending;

  return (
    <div className={`${bg} px-3 py-1 rounded-full flex items-center gap-1.5`}>
      <Icon className={`w-3.5 h-3.5 ${text} ${spin ? 'animate-spin' : ''}`} />
      <span className={`text-xs font-medium ${text}`}>{label}</span>
    </div>
  );
};

// Result Display Component
const ResultDisplay = ({ result }) => {
  const [primaryIndex, setPrimaryIndex] = React.useState(0);
  const resultData = typeof result === 'string' ? JSON.parse(result) : result;

  // Check if result contains multiple images (array)
  const images = resultData.images || (resultData.output_url ? [resultData] : []);

  if (images.length === 0) {
    return (
      <div className="text-sm text-gray-400">
        Result available (no preview)
      </div>
    );
  }

  // Single image display
  if (images.length === 1) {
    const imageData = images[0];
    const imageSource = imageData.output_url ||
      (imageData.output_data ? `data:image/png;base64,${imageData.output_data}` : null) ||
      (resultData.output_url || (resultData.output_data ? `data:image/png;base64,${resultData.output_data}` : null));

    if (!imageSource) {
      return (
        <div className="text-sm text-gray-400">
          Result available (no preview)
        </div>
      );
    }

    const handleOpenInViewer = async () => {
      // Prefer file_path (actual file path) over output_url (which might be asset:// or http://)
      const pathToOpen = imageData.file_path || resultData.file_path || imageData.output_url || resultData.output_url;
      if (pathToOpen) {
        try {
          await invoke('open_in_default_app', { path: pathToOpen });
        } catch (error) {
          console.error('Failed to open image in viewer:', error);
        }
      }
    };

    return (
      <div className="relative group">
        <img
          src={imageSource}
          alt="Generated content"
          className="w-full rounded-lg border border-white/10"
        />
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {(imageData.file_path || resultData.file_path || imageData.output_url || resultData.output_url) && (
            <button
              onClick={handleOpenInViewer}
              className="px-3 py-1 bg-black/70 hover:bg-black/90 text-white text-xs rounded transition-colors flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Open in Viewer
            </button>
          )}
        </div>
      </div>
    );
  }

  // Multiple images display - reorder based on primaryIndex
  const reorderedImages = [
    images[primaryIndex],
    ...images.slice(0, primaryIndex),
    ...images.slice(primaryIndex + 1)
  ];

  const handleThumbnailClick = (thumbnailIndex) => {
    // Calculate original index from reordered position
    let originalIndex;
    if (thumbnailIndex === 0) {
      originalIndex = primaryIndex;
    } else if (thumbnailIndex <= primaryIndex) {
      originalIndex = thumbnailIndex - 1;
    } else {
      originalIndex = thumbnailIndex;
    }
    setPrimaryIndex(originalIndex);
  };

  return (
    <div className="space-y-3">
      {/* Primary image (first one in reordered array) */}
      <ImageCard
        imageData={reorderedImages[0]}
        isPrimary={true}
        index={primaryIndex}
        onClick={() => {}}
      />

      {/* Thumbnail grid for additional images */}
      {reorderedImages.length > 1 && (
        <div className="grid grid-cols-3 gap-2">
          {reorderedImages.slice(1).map((imageData, idx) => {
            // Calculate original index for display
            const originalIdx = idx < primaryIndex ? idx : idx + 1;
            return (
              <ImageCard
                key={originalIdx}
                imageData={imageData}
                isPrimary={false}
                index={originalIdx}
                onClick={() => handleThumbnailClick(idx + 1)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// Individual Image Card Component
const ImageCard = ({ imageData, isPrimary, index, onClick }) => {
  const imageSource = imageData.output_url ||
    (imageData.output_data ? `data:image/png;base64,${imageData.output_data}` : null);

  if (!imageSource) return null;

  const handleOpenInViewer = async (e) => {
    e.stopPropagation();
    // Prefer file_path (actual file path) over output_url (which might be asset:// or http://)
    const pathToOpen = imageData.file_path || imageData.output_url;
    if (pathToOpen) {
      try {
        await invoke('open_in_default_app', { path: pathToOpen });
      } catch (error) {
        console.error('Failed to open image in viewer:', error);
      }
    }
  };

  return (
    <div
      className={`relative group ${isPrimary ? '' : 'aspect-square cursor-pointer'}`}
      onClick={!isPrimary ? onClick : undefined}
    >
      <img
        src={imageSource}
        alt={`Generated content ${index + 1}`}
        className={`w-full rounded-lg border border-white/10 ${isPrimary ? '' : 'object-cover h-full'}`}
      />
      <div className={`absolute ${isPrimary ? 'top-2 right-2' : 'inset-0 bg-black/50'} flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ${isPrimary ? '' : 'items-center justify-center'}`}>
        {(imageData.file_path || imageData.output_url) && (
          <button
            onClick={handleOpenInViewer}
            className={`${isPrimary ? 'px-3 py-1' : 'p-2'} bg-black/70 hover:bg-black/90 text-white text-xs rounded transition-colors flex items-center gap-1 ${isPrimary ? '' : 'justify-center'}`}
            title="Open in Viewer"
          >
            <ExternalLink className="w-3 h-3" />
            {isPrimary && 'Open in Viewer'}
          </button>
        )}
      </div>
      {!isPrimary && (
        <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none">
          {index + 1}
        </div>
      )}
    </div>
  );
};

