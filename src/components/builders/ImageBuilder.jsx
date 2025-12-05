import React, { useState, useMemo } from 'react';
import { Image, Sparkles, MinusCircle, Loader2, CheckCircle2, XCircle, Zap, Download } from 'lucide-react';
import { TextArea, Select } from '@promptcraft/ui/components/atoms/Input.jsx';
import { SectionHeader } from '@promptcraft/ui/components/molecules/SectionHeader.jsx';
import { TagGroup } from '@promptcraft/ui/components/molecules/TagGroup.jsx';
import { EnhanceButton } from '@promptcraft/ui/components/molecules/EnhanceButton.jsx';
import { SD_CATEGORIES } from '@promptcraft/ui/constants/tagCategories.js';
import { callAI } from '@promptcraft/ui/utils/aiApi.js';
import { useGeneration } from '@promptcraft/ui/hooks/useGeneration.js';
import { usePlatform } from '@promptcraft/ui/hooks/usePlatform.js';
import { useProviders } from '../../hooks/useProviders.js';
import { getModelById, getModelProvider } from '../../constants/models.js';

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
  workflowId = 'default'
}) => {
  // Route to specialized builders for Grok and Midjourney
  if (model === 'grok-2-image' || model === 'aurora') {
    return (
      <GrokBuilder
        prompt={prompt}
        setPrompt={setPrompt}
        workflowId={workflowId}
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
  workflowId
}) => {
  const modelConfig = getModelById(model);
  const provider = getModelProvider(model);
  const isOpenAIImage = provider === 'openai';
  const isComfy = model === 'comfy';
  const isA1111 = model === 'a1111';
  const isSDModel = isComfy || isA1111;

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [categories, setCategories] = useState(SD_CATEGORIES);

  // Generation hooks
  const { generate, generating, error, latestJob, completedJobs } = useGeneration(workflowId);
  const { getProviderDisplayName } = useProviders();
  const [localError, setLocalError] = useState(null);

  // OpenAI Image Model (GPT-Image) specific parameters
  const [size, setSize] = useState('1024x1024');
  const [quality, setQuality] = useState('standard');
  const [style, setStyle] = useState('vivid');

  // A1111 specific parameters
  const [steps, setSteps] = useState(params.steps || 20);
  const [cfgScale, setCfgScale] = useState(params.cfg_scale || 7);
  const [width, setWidth] = useState(params.width || 512);
  const [height, setHeight] = useState(params.height || 512);
  const [sampler, setSampler] = useState(params.sampler || 'Euler a');

  const handleEnhance = async () => {
    if (!prompt) return;
    setIsEnhancing(true);

    let systemPrompt;
    if (isOpenAIImage) {
      systemPrompt = "You are an expert prompt engineer for OpenAI's GPT Image models. Transform the user's concept into a highly detailed, visually descriptive prompt. Focus on composition, lighting, style, colors, and mood. Keep it under 150 words. Return ONLY the prompt.";
    } else if (isSDModel) {
      systemPrompt = "You are an expert prompt engineer for Stable Diffusion. Transform the user's concept into a detailed prompt using comma-separated tags and descriptors. Include quality tags, artistic style, composition, lighting, and technical details. Keep it concise. Return ONLY the prompt.";
    } else {
      systemPrompt = "You are an expert image prompt engineer. Transform the user's concept into a detailed, visually rich description. Focus on composition, style, lighting, and mood. Return ONLY the prompt.";
    }

    const result = await callAI(prompt, systemPrompt);
    setPrompt(result);
    setIsEnhancing(false);
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
                    Generate with {getProviderDisplayName(provider)}
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
      {!isComfy && (error || localError || latestJob || completedJobs.length > 0) && (
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

            {/* Completed Jobs List */}
            {completedJobs.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-300">Recent Generations ({completedJobs.length})</h3>
                <div className="grid grid-cols-2 gap-2">
                  {completedJobs.slice(0, 6).map((job) => (
                    <CompletedJobCard key={job.id} job={job} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
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
  const resultData = typeof result === 'string' ? JSON.parse(result) : result;

  if (resultData.output_url) {
    return (
      <div className="relative group">
        <img
          src={resultData.output_url}
          alt="Generated content"
          className="w-full rounded-lg border border-white/10"
        />
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={resultData.output_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-black/70 hover:bg-black/90 text-white text-xs rounded transition-colors"
          >
            Open Full Size
          </a>
          <a
            href={resultData.output_url}
            download
            className="px-3 py-1 bg-black/70 hover:bg-black/90 text-white text-xs rounded transition-colors flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            Download
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="text-sm text-gray-400">
      Result available (no preview)
    </div>
  );
};

// Completed Job Card Component
const CompletedJobCard = ({ job }) => {
  const result = job.result ? (typeof job.result === 'string' ? JSON.parse(job.result) : job.result) : null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors cursor-pointer">
      {result?.output_url ? (
        <img
          src={result.output_url}
          alt="Generation"
          className="w-full aspect-square object-cover rounded"
        />
      ) : (
        <div className="w-full aspect-square bg-gray-800 rounded flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
      )}
      <div className="mt-1 text-xs text-gray-400 truncate">
        {new Date(job.created_at).toLocaleDateString()}
      </div>
    </div>
  );
};
