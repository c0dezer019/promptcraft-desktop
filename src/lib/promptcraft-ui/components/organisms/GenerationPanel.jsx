import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { useGeneration } from '../../hooks/useGeneration.js';
import { useProviders } from '../../hooks/useProviders.js';
import { usePlatform } from '../../hooks/usePlatform.js';

/**
 * GenerationPanel Component
 * Displays generation controls and job status
 *
 * @param {string} workflowId - Current workflow ID
 * @param {string} prompt - Prompt to generate from
 * @param {string} provider - Selected provider (openai, google, etc.)
 * @param {object} parameters - Provider-specific parameters
 */
export const GenerationPanel = ({ workflowId, prompt, provider = 'openai', parameters = {} }) => {
  const { isDesktop } = usePlatform();
  const { generate, generating, error, latestJob, completedJobs } = useGeneration(workflowId);
  const { getProviderDisplayName, getDefaultModel } = useProviders();
  const [localError, setLocalError] = useState(null);

  const handleGenerate = async () => {
    if (!prompt || !prompt.trim()) {
      setLocalError('Please enter a prompt first');
      return;
    }

    setLocalError(null);
    const model = getDefaultModel(provider);
    await generate(provider, prompt, model, parameters);
  };

  if (!isDesktop) {
    return (
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-sm text-yellow-200">
          Generation is only available in desktop mode. Please use the desktop app to generate content.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
