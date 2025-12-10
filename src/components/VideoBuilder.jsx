import React, { useState } from 'react';
import { Video, Settings, Sparkles, Zap, Download } from 'lucide-react';
import { TextArea, Select } from '../lib/promptcraft-ui/components/atoms/Input.jsx';
import { SectionHeader } from '../lib/promptcraft-ui/components/molecules/SectionHeader.jsx';
import { TagGroup } from '../lib/promptcraft-ui/components/molecules/TagGroup.jsx';
import { EnhanceButton } from '../lib/promptcraft-ui/components/molecules/EnhanceButton.jsx';
import { VIDEO_CATEGORIES } from '../lib/promptcraft-ui/constants/tagCategories.js';
import { callAI } from '../utils/aiApi.js';
import { useGeneration } from '../lib/promptcraft-ui/hooks/useGeneration.js';
import { usePlatform } from '../lib/promptcraft-ui/hooks/usePlatform.js';
import { useProviders } from '../hooks/useProviders.js';
import { getModelById, getModelProvider } from '../constants/models.js';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { EnhancementErrorModal } from './EnhancementErrorModal.jsx';

/**
 * VideoBuilder Component - For Sora / Veo video generation
 * LOCAL OVERRIDE: Updated to use model prop and derive provider dynamically
 *
 * @param {string} model - Model ID (e.g., 'sora', 'sora-2-pro', 'veo', 'veo-3.1-generate-preview')
 * @param {string} prompt - Main prompt text
 * @param {function} setPrompt - Prompt setter
 * @param {Array} modifiers - Modifier tags
 * @param {function} setModifiers - Modifiers setter
 * @param {function} deleteEnhancer - Function to delete an enhancer
 * @param {function} editEnhancer - Function to edit an enhancer
 * @param {function} syncEnhancer - Function to sync enhancer across builders
 * @param {string} workflowId - Current workflow ID (optional, for generation)
 * @param {function} onOpenSettings - Function to open settings modal
 */
export const VideoBuilder = ({
  model,
  prompt,
  setPrompt,
  modifiers,
  setModifiers,
  deleteEnhancer,
  editEnhancer,
  syncEnhancer,
  workflowId = 'default',
  onOpenSettings
}) => {
  // Derive provider from model
  const modelConfig = getModelById(model);
  const provider = getModelProvider(model);
  const isSora = provider === 'openai';

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [categories, setCategories] = useState(VIDEO_CATEGORIES);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [enhancementError, setEnhancementError] = useState('');

  // Video generation parameters
  const [duration, setDuration] = useState('5');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('1080p');

  // Generation hooks
  const { generate, generating, error, latestJob, completedJobs } = useGeneration(workflowId);
  const { getProviderDisplayName } = useProviders();
  const [localError, setLocalError] = useState(null);

  const handleEnhance = async () => {
    if (!prompt) return;
    setIsEnhancing(true);
    setLocalError(null);

    // Get enhance prompt based on provider
    let systemPrompt;
    switch (provider) {
      case 'openai':
        systemPrompt = "You are an expert prompt engineer for OpenAI Sora. Enhance the user's prompt by adding missing details ONLY where they are lacking. PRESERVE the original structure, format, and any existing specific details (dialogue, actions, scene descriptions). Only add details about: lighting, camera movement, texture, temporal consistency, or physical accuracy where not specified. Do not remove or restructure existing content. Keep it under 100 words. Return ONLY the enhanced prompt.";
        break;
      case 'google':
        systemPrompt = "You are an expert prompt engineer for Google Veo. Enhance the user's prompt by adding missing details ONLY where they are lacking. PRESERVE the original structure, format, and any existing specific details (dialogue, actions, scene descriptions). Only add details about: composition, color grading, or smooth motion where not specified. Do not remove or restructure existing content. Keep it under 100 words. Return ONLY the enhanced prompt.";
        break;
      case 'runway':
        systemPrompt = "You are an expert prompt engineer for Runway Gen-3. Enhance the user's prompt by adding missing details ONLY where they are lacking. PRESERVE the original structure, format, and any existing specific details (dialogue, actions, scene descriptions). Only add details about: visual aesthetics, motion dynamics, or cinematic quality where not specified. Do not remove or restructure existing content. Keep it under 100 words. Return ONLY the enhanced prompt.";
        break;
      case 'luma':
        systemPrompt = "You are an expert prompt engineer for Luma Dream Machine. Enhance the user's prompt by adding missing details ONLY where they are lacking. PRESERVE the original structure, format, and any existing specific details (dialogue, actions, scene descriptions). Only add details about: natural motion, lighting, or photorealistic quality where not specified. Do not remove or restructure existing content. Keep it under 100 words. Return ONLY the enhanced prompt.";
        break;
      case 'hailuo':
        systemPrompt = "You are an expert prompt engineer for Hailuo MiniMax. Enhance the user's prompt by adding missing details ONLY where they are lacking. PRESERVE the original structure, format, and any existing specific details (dialogue, actions, scene descriptions). Only add details about: smooth motion, high-quality rendering, or cinematic composition where not specified. Do not remove or restructure existing content. Keep it under 100 words. Return ONLY the enhanced prompt.";
        break;
      default:
        systemPrompt = "You are an expert video prompt engineer. Enhance the user's prompt by adding missing details ONLY where they are lacking. PRESERVE the original structure, format, and any existing specific details (dialogue, actions, scene descriptions). Only add details about: visual quality, motion, or atmosphere where not specified. Do not remove or restructure existing content. Keep it under 100 words. Return ONLY the enhanced prompt.";
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
      syncEnhancer(tag, 'video');
    }
  };

  const handleGenerate = async () => {
    if (!prompt || !prompt.trim()) {
      setLocalError('Please enter a prompt first');
      return;
    }

    setLocalError(null);
    const fullPrompt = prompt + (modifiers.length > 0 ? ' ' + modifiers.join(' ') : '');

    // Parse duration from select value
    const durationSeconds = parseInt(duration.split(' ')[0]) || 5;

    // Parse aspect ratio for API
    const aspectRatioValue = aspectRatio.split(' ')[0]; // "16:9" from "16:9 (Widescreen)"

    const parameters = {
      duration: durationSeconds,
      aspect_ratio: aspectRatioValue,
      resolution: resolution,
    };

    await generate(provider, fullPrompt, model, parameters);
  };

  // Get duration and aspect ratio options from model config
  const getDurationOptions = () => {
    const durations = modelConfig?.parameters?.duration || [5];
    return durations.map(d => `${d} Seconds`);
  };

  const getAspectRatioOptions = () => {
    const ratios = modelConfig?.parameters?.aspect_ratio || ['16:9', '9:16', '1:1'];
    const labels = {
      '16:9': 'Widescreen',
      '9:16': 'Vertical',
      '1:1': 'Square',
      '2.35:1': 'Cinematic',
      '4:3': '4:3',
      '3:4': '3:4',
      '21:9': 'Ultrawide',
      '9:21': 'Vertical Ultrawide'
    };
    return ratios.map(r => `${r} (${labels[r] || r})`);
  };

  const getResolutionOptions = () => {
    return modelConfig?.parameters?.resolution || ['720p', '1080p'];
  };

  const durationOptions = getDurationOptions();
  const aspectRatioOptions = getAspectRatioOptions();
  const resolutionOptions = getResolutionOptions();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 relative">
            <SectionHeader
              icon={Video}
              title={`Main ${modelConfig?.name || (isSora ? 'Sora' : 'Veo')} Prompt`}
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
              placeholder={`Describe the video in detail...`}
              rows={12}
            />
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <SectionHeader icon={Settings} title="Parameters" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Duration</label>
                <Select
                  className="mt-1"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  options={durationOptions}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Aspect Ratio</label>
                <Select
                  className="mt-1"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  options={aspectRatioOptions}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Resolution</label>
                <Select
                  className="mt-1"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  options={resolutionOptions}
                />
              </div>
            </div>
          </div>

          {/* Generation Button - Outside Parameters Container */}
          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={generating || !prompt}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Video...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate with {getProviderDisplayName(provider)}
                </>
              )}
            </button>
          </div>
        </div>

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
      {(error || localError || latestJob || completedJobs.length > 0) && (
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
                    <ResultDisplay result={latestJob.result} type="video" />
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
                    <CompletedJobCard key={job.id} job={job} type="video" />
                  ))}
                </div>
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
const ResultDisplay = ({ result, type }) => {
  const resultData = typeof result === 'string' ? JSON.parse(result) : result;

  if (resultData.output_url) {
    return (
      <div className="relative group">
        {type === 'video' ? (
          <video
            src={resultData.output_url}
            controls
            className="w-full rounded-lg border border-white/10"
          />
        ) : (
          <img
            src={resultData.output_url}
            alt="Generated content"
            className="w-full rounded-lg border border-white/10"
          />
        )}
        <div className="absolute top-2 right-2 flex gap-2">
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
const CompletedJobCard = ({ job, type }) => {
  const result = job.result ? (typeof job.result === 'string' ? JSON.parse(job.result) : job.result) : null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors cursor-pointer">
      {result?.output_url ? (
        type === 'video' ? (
          <video
            src={result.output_url}
            className="w-full aspect-video object-cover rounded"
          />
        ) : (
          <img
            src={result.output_url}
            alt="Generation"
            className="w-full aspect-square object-cover rounded"
          />
        )
      ) : (
        <div className="w-full aspect-video bg-gray-800 rounded flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
      )}
      <div className="mt-1 text-xs text-gray-400 truncate">
        {new Date(job.created_at).toLocaleDateString()}
      </div>
    </div>
  );
};
