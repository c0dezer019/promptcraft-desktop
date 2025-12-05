import React, { useState } from 'react';
import { Terminal, Sparkles, Loader2, Plus, Check, X, Zap, Download } from 'lucide-react';
import { TextArea } from '@promptcraft/ui/components/atoms/Input.jsx';
import { SectionHeader } from '@promptcraft/ui/components/molecules/SectionHeader.jsx';
import { EnhanceButton } from '@promptcraft/ui/components/molecules/EnhanceButton.jsx';
import { GROK_HELPER_BADGES } from '@promptcraft/ui/constants/tagCategories.js';
import { callAI } from '@promptcraft/ui/utils/aiApi.js';
import { useGeneration } from '@promptcraft/ui/hooks/useGeneration.js';
import { useProviders } from '../hooks/useProviders.js';
import { CheckCircle2, XCircle } from 'lucide-react';

/**
 * GrokBuilder Component - For Grok / Aurora image generation
 * LOCAL OVERRIDE: Updated to use grok-2-image model
 *
 * @param {string} prompt - Main prompt text
 * @param {function} setPrompt - Prompt setter
 * @param {string} workflowId - Current workflow ID (optional, for generation)
 */
export const GrokBuilder = ({ prompt, setPrompt, workflowId = 'default' }) => {
  const [tone, setTone] = useState('Standard');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [helperBadges, setHelperBadges] = useState(GROK_HELPER_BADGES);
  const [isAddingBadge, setIsAddingBadge] = useState(false);
  const [newBadge, setNewBadge] = useState('');

  // Generation hooks
  const { generate, generating, error, latestJob, completedJobs } = useGeneration(workflowId);
  const { getProviderDisplayName } = useProviders();
  const [localError, setLocalError] = useState(null);

  const provider = 'grok';
  const model = 'grok-2-image';

  const handleAddBadge = () => {
    if (newBadge.trim()) {
      setHelperBadges([...helperBadges, newBadge.trim()]);
      setNewBadge('');
      setIsAddingBadge(false);
    }
  };

  const handleEnhance = async () => {
    if (!prompt) return;
    setIsEnhancing(true);
    let instruction = "You are an expert prompt writer for Grok (Aurora) image generation. Rewrite the user's prompt to be highly descriptive, using natural language. Focus on clarity and visual fidelity.";
    if (tone === 'Fun Mode') instruction = "You are an expert prompt writer for Grok. Rewrite the user's prompt to be witty, rebellious, and humorous, while still describing an image. Make it fun.";
    if (tone === 'Technical') instruction = "You are an expert prompt writer. Rewrite the prompt to be precise, technical, and code-oriented if applicable.";

    const result = await callAI(prompt, instruction + " Return ONLY the prompt text.");
    setPrompt(result);
    setIsEnhancing(false);
  };

  const handleGenerate = async () => {
    if (!prompt || !prompt.trim()) {
      setLocalError('Please enter a prompt first');
      return;
    }

    setLocalError(null);
    const parameters = {
      tone: tone,
      n: 1,
      response_format: 'url'
    };
    await generate(provider, prompt, model, parameters);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <SectionHeader icon={Terminal} title="Grok Prompt Console" />
            <div className="flex flex-wrap gap-2 items-center">
              <EnhanceButton
                isEnhancing={isEnhancing}
                disabled={!prompt}
                onClick={handleEnhance}
                variant="refine"
                label="Refine"
                className="mr-2"
              />
              <div className="hidden sm:block h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
              {['Standard', 'Fun Mode', 'Technical'].map((m) => (
                <button
                  key={m}
                  onClick={() => setTone(m)}
                  className={`px-3 py-1 text-xs rounded-full border transition-all ${
                    tone === m
                      ? 'bg-indigo-100 border-indigo-500 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                      : 'border-gray-200 dark:border-gray-600 text-gray-500'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <TextArea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask Grok something or describe an image for Aurora generation..."
            className="font-mono text-sm bg-gray-900 text-green-400 border border-gray-700"
            rows={16}
          />

          <div className="mt-4 flex flex-wrap gap-2 items-center">
            {helperBadges.map((badge, i) => (
              <button
                key={i}
                onClick={() => setPrompt(prompt + (prompt ? " " : "") + badge)}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                + {badge}
              </button>
            ))}

            {isAddingBadge ? (
              <div className="flex items-center gap-1 w-full sm:w-auto mt-2 sm:mt-0">
                <input
                  autoFocus
                  value={newBadge}
                  onChange={(e) => setNewBadge(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddBadge()}
                  className="flex-1 sm:flex-none text-xs px-2 py-1 w-full sm:w-24 rounded-full bg-gray-800 text-green-400 border border-gray-600 outline-none"
                  placeholder="New..."
                />
                <button onClick={handleAddBadge} className="text-green-500 hover:text-green-400">
                  <Check size={14} />
                </button>
                <button onClick={() => setIsAddingBadge(false)} className="text-gray-500 hover:text-gray-400">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingBadge(true)}
                className="px-2 py-1 border border-dashed border-gray-400 dark:border-gray-600 text-gray-400 text-xs rounded-full hover:text-indigo-500 hover:border-indigo-500 transition-colors flex items-center gap-1"
              >
                <Plus size={10} /> Add
              </button>
            )}
          </div>

          {/* Generation Button - Outside Main Container */}
          <div className="flex justify-end mt-4">
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
