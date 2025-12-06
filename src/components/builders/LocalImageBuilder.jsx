import { useState } from 'react';
import { Wand2, Sparkles, Settings as SettingsIcon } from 'lucide-react';
import { getActiveTool } from '../../utils/localToolConfig.js';

/**
 * LocalImageBuilder Component
 * Interface for local image generation (ComfyUI, A1111, InvokeAI)
 */
export const LocalImageBuilder = ({
  selectedModel,
  prompt,
  setPrompt,
  negativePrompt,
  setNegativePrompt
}) => {
  const activeTool = getActiveTool();

  // Local-specific parameters
  const [steps, setSteps] = useState(20);
  const [cfgScale, setCfgScale] = useState(7);
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [sampler, setSampler] = useState('Euler a');
  const [seed, setSeed] = useState(-1);

  // Common samplers across tools
  const samplers = [
    'Euler a',
    'Euler',
    'DPM++ 2M Karras',
    'DPM++ SDE Karras',
    'DDIM',
    'LMS'
  ];

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
    if (window.__TAURI__) {
      try {
        const { invoke } = window.__TAURI__.core;

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
    } else {
      alert('Desktop mode required for local generation');
    }
  };

  return (
    <div className="space-y-6">
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
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to generate..."
          className="w-full h-32 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
        />
      </div>

      {/* Negative Prompt */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Negative Prompt
        </label>
        <textarea
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          placeholder="What to avoid in the generation..."
          className="w-full h-24 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
        />
      </div>

      {/* Parameters Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Steps */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Steps: {steps}
          </label>
          <input
            type="range"
            min="1"
            max="150"
            value={steps}
            onChange={(e) => setSteps(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* CFG Scale */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            CFG Scale: {cfgScale}
          </label>
          <input
            type="range"
            min="1"
            max="30"
            step="0.5"
            value={cfgScale}
            onChange={(e) => setCfgScale(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Sampler */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sampler
          </label>
          <select
            value={sampler}
            onChange={(e) => setSampler(e.target.value)}
            className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {samplers.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Width */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Width: {width}
          </label>
          <input
            type="range"
            min="256"
            max="2048"
            step="64"
            value={width}
            onChange={(e) => setWidth(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Height */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Height: {height}
          </label>
          <input
            type="range"
            min="256"
            max="2048"
            step="64"
            value={height}
            onChange={(e) => setHeight(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Seed */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Seed
          </label>
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(parseInt(e.target.value))}
            placeholder="-1 for random"
            className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!selectedModel || !prompt}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Wand2 className="w-5 h-5" />
        Generate Image
      </button>

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
  );
};

export default LocalImageBuilder;
