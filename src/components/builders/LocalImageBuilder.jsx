import { useState } from 'react';
import { Wand2, Sparkles, Settings as SettingsIcon, MinusCircle, Image } from 'lucide-react';
import { getActiveTool } from '../../utils/localToolConfig.js';
import { invoke } from '@tauri-apps/api/core';
import { SD_CATEGORIES } from '../../lib/promptcraft-ui/constants/tagCategories.js';
import { SectionHeader } from '../../lib/promptcraft-ui/components/molecules/SectionHeader.jsx';
import { TagGroup } from '../../lib/promptcraft-ui/components/molecules/TagGroup.jsx';
import { EnhanceButton } from '../../lib/promptcraft-ui/components/molecules/EnhanceButton.jsx';
import { ReferenceImageUpload } from '../../lib/promptcraft-ui/components/molecules/ReferenceImageUpload.jsx';
import { callAI } from '../../utils/aiApi.js';
import { EnhancementErrorModal } from '../EnhancementErrorModal.jsx';

/**
 * LocalImageBuilder Component
 * Interface for local image generation (ComfyUI, A1111, InvokeAI)
 */
export const LocalImageBuilder = ({
  selectedModel,
  prompt,
  setPrompt,
  negativePrompt,
  setNegativePrompt,
  modifiers = [],
  setModifiers,
  params = {},
  setParams,
  onOpenSettings
}) => {
  const activeTool = getActiveTool();

  // Local-specific parameters
  const [steps, setSteps] = useState(20);
  const [cfgScale, setCfgScale] = useState(7);
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [sampler, setSampler] = useState('Euler a');
  const [seed, setSeed] = useState(-1);

  // Enhancement state
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [categories, setCategories] = useState(SD_CATEGORIES);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [enhancementError, setEnhancementError] = useState('');

  // Common samplers across tools
  const samplers = [
    'Euler a',
    'Euler',
    'DPM++ 2M Karras',
    'DPM++ SDE Karras',
    'DDIM',
    'LMS'
  ];

  const handleEnhance = async () => {
    if (!prompt) return;
    setIsEnhancing(true);

    const systemPrompt = "You are an expert prompt engineer for Stable Diffusion. Enhance the user's prompt by adding missing visual details ONLY where they are lacking. PRESERVE existing tags and descriptors. Only add: quality tags, artistic style, composition, lighting, or technical details where not specified. Do not remove or restructure existing content. Keep it concise. Return ONLY the enhanced prompt.";

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

  const handleGenerate = async () => {
    if (!activeTool || !selectedModel) {
      console.error('No active tool or model selected');
      return;
    }

    console.log('Generate with local tool:', {
      tool: activeTool?.name,
      model: selectedModel,
      prompt,
      negativePrompt,
      steps,
      cfgScale,
      width,
      height,
      sampler,
      seed
    });

    // Submit generation via Tauri backend
    try {
      const parameters = {
        model: selectedModel,
        negative_prompt: negativePrompt,
        steps,
        cfg_scale: cfgScale,
        width,
        height,
        sampler,
        seed
      };

      // Add reference images if present
      if (params.referenceImages && params.referenceImages.length > 0) {
        parameters.reference_images = params.referenceImages;
      }

      // Submit generation job
      const job = await invoke('submit_generation', {
        workflowId: null,
        provider: activeTool.id,
        prompt,
        model: selectedModel,
        parameters
      });

      console.log('Generation job submitted:', job);
      // TODO: Show job status and poll for results
    } catch (error) {
      console.error('Failed to submit generation:', error);
      alert(`Generation failed: ${error}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Tool Info Banner */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800">
            <div className="flex items-center gap-2 text-sm text-indigo-700 dark:text-indigo-300">
              <SettingsIcon className="w-4 h-4" />
              <span>
                Generating with <strong>{activeTool?.name || 'Local Tool'}</strong>
                {selectedModel && <> • Model: <strong>{selectedModel}</strong></>}
              </span>
            </div>
          </div>

          {/* Main Prompt */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <SectionHeader
              icon={Image}
              title="Main Prompt"
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
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="masterpiece, best quality, detailed..."
              className="w-full h-32 p-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-gray-900 dark:text-gray-100"
            />

            {/* Active Modifiers Display */}
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

          {/* Negative Prompt */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <SectionHeader icon={MinusCircle} title="Negative Prompt" />
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="ugly, blurry, low quality..."
              className="w-full h-24 p-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Reference Images */}
          <ReferenceImageUpload
            referenceImages={params.referenceImages || []}
            onImagesChange={(images) => setParams({ ...params, referenceImages: images })}
            showAdvancedControls={true}
            provider={activeTool?.id}
            onParamsChange={(updates) => setParams({ ...params, ...updates })}
          />

          {/* Parameters Grid */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <SectionHeader icon={Sparkles} title="Parameters" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3">
              {/* Steps */}
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
                <input
                  type="range"
                  min="1"
                  max="150"
                  value={steps}
                  onChange={(e) => setSteps(parseInt(e.target.value))}
                  className="w-full mt-1"
                />
              </div>

              {/* CFG Scale */}
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
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="0.5"
                  value={cfgScale}
                  onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                  className="w-full mt-1"
                />
              </div>

              {/* Sampler */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Sampler</label>
                <select
                  value={sampler}
                  onChange={(e) => setSampler(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                >
                  {samplers.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Width */}
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
                <input
                  type="range"
                  min="256"
                  max="2048"
                  step="64"
                  value={width}
                  onChange={(e) => setWidth(parseInt(e.target.value))}
                  className="w-full mt-1"
                />
              </div>

              {/* Height */}
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
                <input
                  type="range"
                  min="256"
                  max="2048"
                  step="64"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value))}
                  className="w-full mt-1"
                />
              </div>

              {/* Seed */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Seed</label>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(parseInt(e.target.value))}
                  placeholder="-1 for random"
                  className="mt-1 w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={!selectedModel || !prompt}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Wand2 className="w-5 h-5" />
              Generate Image
            </button>
          </div>

          {/* Info Notice */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
              <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-indigo-500" />
              <span>
                Local generation is in preview. Make sure {activeTool?.name || 'your local tool'} is running at {activeTool?.apiUrl}
              </span>
            </p>
          </div>
        </div>

        {/* Enhancers Sidebar */}
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
            />
          ))}
        </div>
      </div>

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

export default LocalImageBuilder;
