import React, { useState } from 'react';
import { ImageIcon, Sparkles, Wand2, Zap, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { TextArea } from '../atoms';
import { SectionHeader, EnhanceButton } from '../molecules';
import { callAI } from '../../utils/aiApi';
import { useGeneration } from '../../hooks/useGeneration.js';
import { useProviders } from '../../hooks/useProviders.js';
import { usePlatform } from '../../hooks/usePlatform.js';

const DALLE_STYLE_TAGS = ['vivid', 'natural'];
const DALLE_SIZE_TAGS = ['1024x1024', '1024x1792', '1792x1024'];
const DALLE_QUALITY_TAGS = ['standard', 'hd'];

/**
 * DallEBuilder Component - For OpenAI DALL-E 3 image generation
 * @param {string} prompt - Main prompt text
 * @param {function} setPrompt - Prompt setter
 * @param {string} workflowId - Current workflow ID (optional, for generation)
 */
export const DallEBuilder = ({ prompt, setPrompt, workflowId = 'default' }) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('vivid');
  const [selectedSize, setSelectedSize] = useState('1024x1024');
  const [selectedQuality, setSelectedQuality] = useState('standard');

  // Generation hooks
  const { isDesktop } = usePlatform();
  const { generate, generating, error, latestJob } = useGeneration(workflowId);
  const { getProviderDisplayName, getDefaultModel } = useProviders();
  const [localError, setLocalError] = useState(null);
  const provider = 'openai';

  const handleEnhance = async () => {
    if (!prompt) return;
    setIsEnhancing(true);
    const systemPrompt =
      "You are an expert DALL-E 3 prompt engineer. Enhance the user's prompt by adding missing visual details ONLY where they are lacking. PRESERVE the original structure, format, and any existing specific details (dialogue, scene descriptions, character actions, etc.). If it's written as a script, keep it as a script. If it's a paragraph, keep it as a paragraph. Only add details about: visual style, lighting, composition, colors, artistic style, mood, or atmosphere where not already specified. Do not remove or restructure existing content. Keep it under 150 words. Return ONLY the enhanced prompt.";

    const result = await callAI(prompt, systemPrompt);
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
      size: selectedSize,
      quality: selectedQuality,
      style: selectedStyle,
    };
    await generate(provider, prompt, model, parameters);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 relative">
            <SectionHeader
              icon={ImageIcon}
              title="DALL-E 3 Prompt"
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
                {prompt || 'Your prompt will appear here...'}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">Style: {selectedStyle}</span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">Size: {selectedSize}</span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">Quality: {selectedQuality}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 h-full overflow-y-auto pr-2 custom-scrollbar">
          <SectionHeader icon={Sparkles} title="DALL-E Options" />

          {/* Style Selection */}
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Style</h3>
            <div className="flex gap-2">
              {DALLE_STYLE_TAGS.map((style) => (
                <button
                  key={style}
                  onClick={() => setSelectedStyle(style)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-all ${
                    selectedStyle === style
                      ? 'bg-purple-100 border-purple-500 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Size Selection */}
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Size</h3>
            <div className="flex flex-col gap-2">
              {DALLE_SIZE_TAGS.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                    selectedSize === size
                      ? 'bg-purple-100 border-purple-500 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Quality Selection */}
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quality</h3>
            <div className="flex gap-2">
              {DALLE_QUALITY_TAGS.map((quality) => (
                <button
                  key={quality}
                  onClick={() => setSelectedQuality(quality)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-all ${
                    selectedQuality === quality
                      ? 'bg-purple-100 border-purple-500 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {quality}
                </button>
              ))}
            </div>
          </div>
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

