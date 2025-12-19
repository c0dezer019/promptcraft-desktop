import React, { useState } from 'react';
import { Image, Sparkles, Wand2, Zap } from 'lucide-react';
import { TextArea } from '../atoms';
import { SectionHeader, TagGroup, EnhanceButton } from '../molecules';
import { MIDJOURNEY_CATEGORIES } from '../../constants/tagCategories';
import { callAI } from '../../utils/aiApi';
import { useGeneration } from '../../hooks/useGeneration.js';
import { useProviders } from '../../hooks/useProviders.js';
import { usePlatform } from '../../hooks/usePlatform.js';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

/**
 * MidjourneyBuilder Component - For Midjourney image generation
 * @param {string} prompt - Main prompt text
 * @param {function} setPrompt - Prompt setter
 * @param {Array} modifiers - Modifier tags
 * @param {function} setModifiers - Modifiers setter
 * @param {function} deleteEnhancer - Function to delete an enhancer
 * @param {function} editEnhancer - Function to edit an enhancer
 * @param {function} syncEnhancer - Function to sync enhancer across builders
 * @param {string} workflowId - Current workflow ID (optional, for generation)
 */
export const MidjourneyBuilder = ({
  prompt,
  setPrompt,
  modifiers,
  setModifiers,
  deleteEnhancer,
  editEnhancer,
  syncEnhancer,
  workflowId = 'default'
}) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [categories, setCategories] = useState(MIDJOURNEY_CATEGORIES);

  // Generation hooks
  const { isDesktop } = usePlatform();
  const { generate, generating, error, latestJob } = useGeneration(workflowId);
  const { getProviderDisplayName, getDefaultModel } = useProviders();
  const [localError, setLocalError] = useState(null);
  const provider = 'midjourney';

  const handleEnhance = async () => {
    if (!prompt) return;
    setIsEnhancing(true);
    const systemPrompt =
      "You are an expert Midjourney prompt engineer. Enhance the user's prompt by adding missing visual details ONLY where they are lacking. PRESERVE the original structure, format, and any existing specific details (dialogue, scene descriptions, character actions, etc.). If it's written as a script, keep it as a script. If it's a paragraph, keep it as a paragraph. Only add details about: visual style, lighting, composition, colors, textures, camera angles, or atmosphere where not already specified. Do not remove or restructure existing content. Keep it under 150 words. DO NOT include parameters like --ar, --v, or --style. Return ONLY the enhanced prompt.";

    const result = await callAI(prompt, systemPrompt);
    setPrompt(result);
    setIsEnhancing(false);
  };

  const addModifier = (tag) => {
    if (!modifiers.includes(tag)) setModifiers([...modifiers, tag]);
  };

  const handleAddTag = (category, newTag) => {
    setCategories(prev => ({
      ...prev,
      [category]: [...prev[category], newTag]
    }));
  };

  const handleDeleteTag = (tag, index) => {
    if (deleteEnhancer) {
      deleteEnhancer('midjourney', 'modifiers', tag, index);
    }
  };

  const handleEditTag = (oldTag, newTag, index) => {
    if (editEnhancer) {
      editEnhancer('midjourney', 'modifiers', oldTag, newTag, index);
    }
  };

  const handleSyncTag = (tag) => {
    if (syncEnhancer) {
      syncEnhancer(tag, 'midjourney');
    }
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
    if (!prompt || !prompt.trim()) {
      setLocalError('Please enter a prompt first');
      return;
    }

    setLocalError(null);
    const fullPrompt = prompt + (modifiers.length > 0 ? ' ' + modifiers.join(' ') : '');
    const model = getDefaultModel(provider);
    const parameters = {
      // Add Midjourney-specific parameters here if needed
    };
    await generate(provider, fullPrompt, model, parameters);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 relative">
            <SectionHeader
              icon={Image}
              title="Main Midjourney Prompt"
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
              placeholder="Describe your image in detail..."
              rows={8}
            />
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <SectionHeader icon={Wand2} title="Complete Prompt Preview" />
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap">
                {prompt}
                {modifiers.length > 0 && (prompt ? ' ' : '')}
                {modifiers.join(' ')}
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Copy and paste this complete prompt into Midjourney Discord
            </p>
          </div>
        </div>

        <div className="space-y-2 h-full overflow-y-auto pr-2 custom-scrollbar">
          <SectionHeader icon={Sparkles} title="Enhancers & Parameters" />
          {Object.entries(categories).map(([key, tags]) => (
            <TagGroup
              key={key}
              title={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
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

      {/* AI Generation Section */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <SectionHeader icon={Zap} title="AI Generation" />

          <div className="space-y-4 mt-4">
            {/* Generation Button */}
            <button
              onClick={handleGenerate}
              disabled={generating || !prompt}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate with {getProviderDisplayName(provider)}
                </>
              )}
            </button>

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
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const config = {
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', icon: Loader2, label: 'Pending' },
    running: { bg: 'bg-blue-500/20', text: 'text-blue-300', icon: Loader2, label: 'Running', spin: true },
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
        <a
          href={resultData.output_url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-medium"
        >
          Open Full Size
        </a>
      </div>
    );
  }

  return (
    <div className="text-sm text-gray-400">
      Result available (no preview)
    </div>
  );
};

