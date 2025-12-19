import React, { useState } from 'react';
import { Terminal, Sparkles, Loader2, Plus, Check, X, Zap } from 'lucide-react';
import { TextArea } from '../atoms';
import { SectionHeader, EnhanceButton } from '../molecules';
import { GROK_HELPER_BADGES } from '../../constants/tagCategories';
import { callAI } from '../../utils/aiApi';
import { useGeneration } from '../../hooks/useGeneration.js';
import { useProviders } from '../../hooks/useProviders.js';
import { usePlatform } from '../../hooks/usePlatform.js';
import { CheckCircle2, XCircle } from 'lucide-react';

/**
 * GrokBuilder Component - For Grok / Flux image generation
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
  const { isDesktop } = usePlatform();
  const { generate, generating, error, latestJob } = useGeneration(workflowId);
  const { getProviderDisplayName, getDefaultModel } = useProviders();
  const [localError, setLocalError] = useState(null);
  const provider = 'grok';

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
    let instruction = "You are an expert prompt writer for Grok (Flux) image generation. Enhance the user's prompt by adding missing visual details ONLY where they are lacking. PRESERVE the original structure, format, and any existing specific details (dialogue, scene descriptions, character actions, etc.). Only add details about: clarity, visual fidelity, or descriptive elements where not specified. Do not remove or restructure existing content.";
    if (tone === 'Fun Mode') instruction = "You are an expert prompt writer for Grok. Enhance the user's prompt by adding missing visual details ONLY where they are lacking. PRESERVE the original structure, format, and any existing specific details. Add witty, rebellious, or humorous visual elements where appropriate, but do not remove or restructure existing content.";
    if (tone === 'Technical') instruction = "You are an expert prompt writer. Enhance the user's prompt by adding missing technical details ONLY where they are lacking. PRESERVE the original structure, format, and any existing specific details. Only add precise, technical elements where appropriate, but do not remove or restructure existing content.";

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
    const model = getDefaultModel(provider);
    const parameters = {
      tone: tone,
      // Add Grok-specific parameters here if needed
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
            placeholder="Ask Grok something or describe an image for Flux generation..."
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

