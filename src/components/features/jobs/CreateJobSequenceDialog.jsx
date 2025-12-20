import React, { useState } from 'react';
import { X, Film, ChevronUp, ChevronDown, Check } from 'lucide-react';

/**
 * CreateJobSequenceDialog - Modal for creating sequences from generation history
 * Allows selecting jobs and ordering them
 */
export function CreateJobSequenceDialog({ jobs, currentJob, onClose, onCreateSequence }) {
  const [selectedJobs, setSelectedJobs] = useState(currentJob ? [currentJob.id] : []);
  const [sequenceName, setSequenceName] = useState('');
  const [creating, setCreating] = useState(false);

  // Filter to only completed jobs from the same category
  const currentCategory = currentJob?.data?.category || 'image';
  const availableJobs = jobs.filter(j =>
    j.status === 'completed' &&
    j.result?.output_url && // Must have an output
    (!currentJob || (j.data?.category || 'image') === currentCategory)
  );

  const toggleJob = (jobId) => {
    setSelectedJobs(prev =>
      prev.includes(jobId)
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const moveJob = (index, direction) => {
    const newOrder = [...selectedJobs];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newOrder.length) return;

    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    setSelectedJobs(newOrder);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await onCreateSequence(selectedJobs, sequenceName);
      onClose();
    } catch (err) {
      console.error('Failed to create sequence:', err);
      alert('Failed to create sequence: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  // Get image preview for a job
  const getJobImage = (job) => {
    const result = job.result;
    return result?.output_url || (result?.output_data ? `data:image/png;base64,${result.output_data}` : null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Film className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Sequence</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sequence Name */}
        <div className="px-6 pt-6 pb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sequence Name (Optional)
          </label>
          <input
            type="text"
            value={sequenceName}
            onChange={(e) => setSequenceName(e.target.value)}
            placeholder="e.g., Character Transformation, Day to Night, Product Showcase"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Give your sequence a descriptive name to identify it easily
          </p>
        </div>

        {/* Content */}
        <div className="grid grid-cols-2 gap-6 px-6 pb-6 max-h-[60vh]">
          {/* Available Generations */}
          <div className="space-y-3 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Available Generations ({availableJobs.length})
            </h3>
            {availableJobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">No completed generations found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableJobs.map(job => {
                  const image = getJobImage(job);
                  const jobData = job.data;

                  return (
                    <button
                      key={job.id}
                      onClick={() => toggleJob(job.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        selectedJobs.includes(job.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedJobs.includes(job.id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selectedJobs.includes(job.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      {image && (
                        <img
                          src={image}
                          alt="Generation"
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-sm text-gray-900 dark:text-white truncate">
                          {jobData?.provider} / {jobData?.model}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {jobData?.prompt || 'No prompt'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sequence Order */}
          <div className="space-y-3 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Sequence Order ({selectedJobs.length})
            </h3>
            {selectedJobs.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select generations to add to sequence</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedJobs.map((jobId, index) => {
                  const job = jobs.find(j => j.id === jobId);
                  if (!job) return null;

                  const image = getJobImage(job);
                  const jobData = job.data;

                  return (
                    <div
                      key={jobId}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveJob(index, -1)}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveJob(index, 1)}
                          disabled={index === selectedJobs.length - 1}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 w-6">
                        #{index + 1}
                      </span>
                      {image && (
                        <img
                          src={image}
                          alt="Generation"
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 dark:text-white truncate">
                          {jobData?.provider} / {jobData?.model}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {jobData?.prompt || 'No prompt'}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleJob(jobId)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={onClose}
            disabled={creating}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || selectedJobs.length < 2}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {creating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Creating...
              </>
            ) : (
              <>
                <Film className="w-4 h-4" />
                Create Sequence ({selectedJobs.length})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
