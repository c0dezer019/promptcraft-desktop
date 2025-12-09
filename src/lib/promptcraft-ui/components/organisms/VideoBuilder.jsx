import React, { useState } from 'react';
import { Video, Settings, Sparkles, Zap } from 'lucide-react';
import { TextArea, Select } from '../atoms';
import { SectionHeader, TagGroup, EnhanceButton } from '../molecules';
import { VIDEO_CATEGORIES } from '../../constants/tagCategories';
import { callAI } from '../../utils/aiApi';
import { useGeneration } from '../../hooks/useGeneration.js';
import { useProviders } from '../../hooks/useProviders.js';
import { usePlatform } from '../../hooks/usePlatform.js';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

/**
 * VideoBuilder Component - For Sora / Veo video generation
 * @param {string} type - 'sora' | 'veo'
 * @param {string} prompt - Main prompt text
 * @param {function} setPrompt - Prompt setter
 * @param {Array} modifiers - Modifier tags
 * @param {function} setModifiers - Modifiers setter
 * @param {function} deleteEnhancer - Function to delete an enhancer
 * @param {function} editEnhancer - Function to edit an enhancer
 * @param {function} syncEnhancer - Function to sync enhancer across builders
 * @param {string} workflowId - Current workflow ID (optional, for generation)
 */
export const VideoBuilder = ({
  type,
  prompt,
  setPrompt,
  modifiers,
  setModifiers,
  deleteEnhancer,
  editEnhancer,
  syncEnhancer,
  workflowId = 'default'
}) => {
  const isSora = type === 'sora';
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [categories, setCategories] = useState(VIDEO_CATEGORIES);

  // Generation hooks
  const { isDesktop } = usePlatform();
  const { generate, generating, error, latestJob, completedJobs } = useGeneration(workflowId);
  const { getProviderDisplayName, getDefaultModel } = useProviders();
  const [localError, setLocalError] = useState(null);

  // Map builder type to provider
  const provider = type === 'sora' ? 'openai' : 'google';

  const handleEnhance = async () => {
    if (!prompt) return;
    setIsEnhancing(true);
    const systemPrompt = isSora
      ? "You are an expert prompt engineer for OpenAI Sora. Take the user's concept and rewrite it into a highly detailed, physically accurate video description. Focus on lighting, camera movement, texture, and temporal consistency. Keep it under 100 words. Return ONLY the prompt."
      : "You are an expert prompt engineer for Google Veo. Rewrite the user's concept into a cinematic 1080p video description. Focus on composition, color grading, and smooth motion. Return ONLY the prompt.";

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
      syncEnhancer(tag, type);
    }
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
      // Add video-specific parameters here if needed
    };
    await generate(provider, fullPrompt, model, parameters);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 relative">
            <SectionHeader
              icon={Video}
              title={`Main ${isSora ? 'Sora' : 'Veo'} Prompt`}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Duration</label>
                <Select
                  className="mt-1"
                  options={['5 Seconds', '10 Seconds', '20 Seconds', '60 Seconds (Max)']}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Aspect Ratio</label>
                <Select
                  className="mt-1"
                  options={['16:9 (Widescreen)', '9:16 (Vertical)', '1:1 (Square)', '2.35:1 (Cinematic)']}
                />
              </div>
            </div>
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

      {/* AI Generation Section */}
      {isDesktop && (
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
        <video
          src={resultData.output_url}
          controls
          className="w-full rounded-lg border border-white/10"
        />
        <a
          href={resultData.output_url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 px-3 py-1 bg-black/70 hover:bg-black/90 text-white text-xs rounded transition-colors"
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

// Completed Job Card Component
const CompletedJobCard = ({ job }) => {
  const result = job.result ? (typeof job.result === 'string' ? JSON.parse(job.result) : job.result) : null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors cursor-pointer">
      {result?.output_url ? (
        <video
          src={result.output_url}
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
