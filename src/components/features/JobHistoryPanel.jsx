import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Filter, Download, Trash2, CheckCircle2, XCircle, Loader2, Clock, RefreshCw, Eye, GitBranch, Film, CheckSquare, Square, Layers } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { ask } from '@tauri-apps/plugin-dialog';
import { useJobPolling } from '../../lib/promptcraft-ui/hooks/useJobPolling';
import { downloadJobResult } from '../../utils/downloadHelper';
import { usePlatform } from '../../lib/promptcraft-ui/hooks/usePlatform';
import JobDetailModal from './JobDetailModal';
import { isValidImageUrl } from '../../utils/urlValidator';
import { convertToAssetUrl } from '../../utils/fileUrlHelper';
import { useJobs } from '../../hooks/useJobs';
import { CreateJobVariationDialog } from './jobs/CreateJobVariationDialog';
import { useScenes } from '../../hooks/useScenes';

const StatusIcon = ({ status }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'running':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-500" />;
  }
};

const StatusBadge = ({ status }) => {
  const colors = {
    completed: 'bg-green-500/10 text-green-500 border-green-500/20',
    failed: 'bg-red-500/10 text-red-500 border-red-500/20',
    running: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
  };

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium ${colors[status] || colors.pending}`}>
      <StatusIcon status={status} />
      <span className="capitalize">{status}</span>
    </div>
  );
};

/**
 * Save Multi-Output Scene Dialog
 */
const SaveMultiOutputSceneDialog = ({ selectedJobIds, jobs, onClose, onSave }) => {
  const [sceneName, setSceneName] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedJobs = jobs.filter(job => selectedJobIds.includes(job.id));

  const handleSave = async () => {
    if (!sceneName.trim()) {
      alert('Please enter a scene name');
      return;
    }

    setSaving(true);
    try {
      await onSave(sceneName.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full border border-gray-700">
        {/* Header */}
        <div className="border-b border-gray-800 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Save Multi-Output Scene</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Selected Jobs Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Selected Jobs ({selectedJobs.length})
            </label>
            <div className="grid grid-cols-3 gap-2">
              {selectedJobs.slice(0, 6).map(job => {
                const jobResult = job.result && typeof job.result === 'string' ? JSON.parse(job.result) : job.result;
                const safeOutputUrl = jobResult?.output_url && isValidImageUrl(jobResult.output_url)
                  ? jobResult.output_url
                  : null;
                const base64Data = jobResult?.output_data;
                const rawImageSource = safeOutputUrl || (base64Data ? `data:image/png;base64,${base64Data}` : null);
                const imageSource = rawImageSource ? convertToAssetUrl(rawImageSource) : null;

                return (
                  <div key={job.id} className="aspect-square bg-gray-800 rounded overflow-hidden">
                    {imageSource ? (
                      <img
                        src={imageSource}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <Loader2 className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                );
              })}
              {selectedJobs.length > 6 && (
                <div className="aspect-square bg-gray-800 rounded flex items-center justify-center">
                  <span className="text-gray-400 text-sm">+{selectedJobs.length - 6} more</span>
                </div>
              )}
            </div>
          </div>

          {/* Scene Name Input */}
          <div>
            <label htmlFor="scene-name" className="block text-sm font-medium text-gray-300 mb-2">
              Scene Name
            </label>
            <input
              id="scene-name"
              type="text"
              value={sceneName}
              onChange={(e) => setSceneName(e.target.value)}
              placeholder="e.g., Comic Panel - Hero's Journey"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Info */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-sm text-blue-300">
              This will create a multi-output scene with {selectedJobs.length} outputs displayed in a grid layout.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 p-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded-lg text-sm font-medium text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !sceneName.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Layers className="w-4 h-4" />
                Create Scene
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const JobCard = ({ job, onViewDetails, onDownload, onDelete, isDesktop, onPreload, selectMode = false, isSelected = false, onToggleSelect }) => {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const jobData = typeof job.data === 'string' ? JSON.parse(job.data) : job.data;
  const jobResult = job.result && typeof job.result === 'string' ? JSON.parse(job.result) : job.result;

  // Trigger preload on hover
  const handleMouseEnter = () => {
    if (onPreload) {
      onPreload(job);
    }
  };

  // Validate the output URL to prevent XSS
  const safeOutputUrl = jobResult?.output_url && isValidImageUrl(jobResult.output_url)
    ? jobResult.output_url
    : null;

  // Handle base64 output_data (for providers like Gemini that return inline data)
  const base64Data = jobResult?.output_data;
  const rawImageSource = safeOutputUrl || (base64Data ? `data:image/png;base64,${base64Data}` : null);

  // Convert file:// URLs to asset:// protocol for Tauri
  const imageSource = rawImageSource ? convertToAssetUrl(rawImageSource) : null;

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      setDownloading(true);
      await downloadJobResult(job, isDesktop);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download: ' + error.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    // Don't allow multiple deletes
    if (deleting) return;

    // Use Tauri's dialog API for proper confirmation
    const confirmed = await ask('Are you sure you want to delete this job?', {
      title: 'Confirm Delete',
      kind: 'warning'
    });

    if (!confirmed) return;

    try {
      setDeleting(true);
      await invoke('delete_job', { jobId: job.id });
      if (onDelete) onDelete(job.id);
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete job: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleCardClick = () => {
    if (selectMode && onToggleSelect) {
      onToggleSelect(job.id);
    } else {
      onViewDetails(job);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      className={`bg-gray-800 rounded-lg border transition-all cursor-pointer group ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/50'
          : 'border-gray-700 hover:border-gray-600'
      }`}
    >
      {/* Image Preview */}
      {imageSource && (
        <div className="aspect-square relative overflow-hidden rounded-t-lg">
          <img
            src={imageSource}
            alt="Generation result"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
          />

          {/* Selection Checkbox (in select mode) */}
          {selectMode && (
            <div className="absolute top-2 left-2 z-10">
              <div className="bg-gray-900/80 backdrop-blur-sm p-1.5 rounded-lg">
                {isSelected ? (
                  <CheckSquare className="w-5 h-5 text-blue-500" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
          )}

          {/* Action Buttons (hidden in select mode) */}
          {!selectMode && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                title="Download"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => onViewDetails(job)}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                title="View Details"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Job Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {jobData?.provider || 'Unknown'} / {jobData?.model || 'Unknown'}
            </div>
            <div className="text-xs text-gray-400 truncate mt-0.5">
              {jobData?.prompt || 'No prompt'}
            </div>
          </div>
          <StatusBadge status={job.status} />
        </div>

        {/* Variation and Sequence Badges */}
        <div className="flex flex-wrap gap-1.5">
          {jobData?.variationOf && (
            <span className="inline-flex items-center gap-1 text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full">
              <GitBranch className="w-3 h-3" />
              Variation
            </span>
          )}
          {jobData?.sequenceId && (
            <span className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
              <Film className="w-3 h-3" />
              {jobData?.sequenceName || 'Sequence'} #{(jobData?.sequenceOrder ?? 0) + 1}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{new Date(job.created_at).toLocaleDateString()}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded transition-colors disabled:opacity-50"
              title="Delete"
            >
              {deleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {job.status === 'failed' && job.error && (
          <div className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded p-2 truncate">
            {job.error}
          </div>
        )}
      </div>
    </div>
  );
};

export default function JobHistoryPanel({ isOpen, onClose, workflowId = null }) {
  const { isDesktop } = usePlatform();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showVariationDialog, setShowVariationDialog] = useState(false);
  const [variationParentJob, setVariationParentJob] = useState(null);
  const preloadedImages = React.useRef(new Set());

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const [showSaveSceneDialog, setShowSaveSceneDialog] = useState(false);

  // Use the jobs hook for variation operations
  const {
    createJobVariation,
    saveJobAsScene
  } = useJobs(workflowId || 'all');

  // Use the scenes hook for creating multi-output scenes
  const { createSceneWithOutputs } = useScenes(workflowId || 'default');

  // Preload job details on hover
  const handlePreload = React.useCallback((job) => {
    // Parse job result to get image
    const jobResult = job.result && typeof job.result === 'string' ? JSON.parse(job.result) : job.result;

    // Validate the output URL
    const safeOutputUrl = jobResult?.output_url && isValidImageUrl(jobResult.output_url)
      ? jobResult.output_url
      : null;

    // Handle base64 output_data
    const base64Data = jobResult?.output_data;
    const rawImageSource = safeOutputUrl || (base64Data ? `data:image/png;base64,${base64Data}` : null);

    // Convert file:// URLs to asset:// protocol for Tauri
    const imageSource = rawImageSource ? convertToAssetUrl(rawImageSource) : null;

    // Preload image if we haven't already
    if (imageSource && !preloadedImages.current.has(job.id)) {
      const img = new Image();
      img.src = imageSource;
      preloadedImages.current.add(job.id);
    }
  }, []);

  // Load all jobs (across all workflows if workflowId is null)
  const loadJobs = async () => {
    try {
      setLoading(true);
      let allJobs = [];

      if (workflowId) {
        // Load jobs for specific workflow
        allJobs = await invoke('list_jobs', { workflowId });
      } else {
        // Load jobs for all workflows
        // First get all workflows
        const workflows = await invoke('list_workflows');

        // Then load jobs for each workflow
        const jobPromises = workflows.map(workflow =>
          invoke('list_jobs', { workflowId: workflow.id })
        );
        const jobArrays = await Promise.all(jobPromises);
        allJobs = jobArrays.flat();
      }

      // Sort by creation date (newest first)
      allJobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setJobs(allJobs);
    } catch (error) {
      console.error('[JobHistoryPanel] Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadJobs();
    }
  }, [isOpen, workflowId]);

  // Auto-poll for job status updates
  const { isPolling } = useJobPolling(loadJobs, jobs, 3000, isOpen);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Status filter
      if (statusFilter !== 'all' && job.status !== statusFilter) {
        return false;
      }

      // Parse job data
      const jobData = typeof job.data === 'string' ? JSON.parse(job.data) : job.data;

      // Provider filter
      if (providerFilter !== 'all' && jobData?.provider !== providerFilter) {
        return false;
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const prompt = (jobData?.prompt || '').toLowerCase();
        const model = (jobData?.model || '').toLowerCase();
        const provider = (jobData?.provider || '').toLowerCase();

        if (!prompt.includes(query) && !model.includes(query) && !provider.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [jobs, searchQuery, statusFilter, providerFilter]);

  // Get unique providers for filter
  const providers = useMemo(() => {
    const providerSet = new Set();
    jobs.forEach(job => {
      const jobData = typeof job.data === 'string' ? JSON.parse(job.data) : job.data;
      if (jobData?.provider) {
        providerSet.add(jobData.provider);
      }
    });
    return Array.from(providerSet).sort();
  }, [jobs]);

  const handleJobDeleted = (jobId) => {
    setJobs(prev => prev.filter(j => j.id !== jobId));
  };

  const handleViewDetails = (job) => {
    console.time('[JobHistory] Modal open time');
    console.log('[JobHistory] Setting selected job:', job.id);
    setSelectedJob(job);
    setShowDetailModal(true);
    // Use setTimeout to measure after state update
    setTimeout(() => {
      console.timeEnd('[JobHistory] Modal open time');
    }, 0);
  };

  const handleRetry = async (job) => {
    try {
      const jobData = typeof job.data === 'string' ? JSON.parse(job.data) : job.data;

      await invoke('submit_generation', {
        workflowId: job.workflow_id,
        provider: jobData.provider,
        prompt: jobData.prompt,
        model: jobData.model,
        parameters: jobData.parameters || {}
      });

      // Reload jobs to show new job
      await loadJobs();
    } catch (error) {
      console.error('Retry failed:', error);
      alert('Failed to retry job: ' + error.message);
    }
  };

  // Multi-select handlers
  const handleToggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedJobs(new Set()); // Clear selection when toggling
  };

  const handleToggleJobSelection = (jobId) => {
    setSelectedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const handleSaveAsScene = () => {
    if (selectedJobs.size < 2) {
      alert('Please select at least 2 jobs to create a multi-output scene');
      return;
    }
    setShowSaveSceneDialog(true);
  };

  const handleCancelSelect = () => {
    setSelectMode(false);
    setSelectedJobs(new Set());
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Generation History</h2>
                <p className="text-sm text-gray-400">
                  {filteredJobs.length} of {jobs.length} jobs
                  {isPolling && <span className="ml-2 text-blue-400">(polling...)</span>}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Multi-Select Toolbar */}
            {selectMode ? (
              <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="flex-1 text-sm text-white">
                  <span className="font-medium">{selectedJobs.size} jobs selected</span>
                  {selectedJobs.size >= 2 && (
                    <span className="ml-2 text-gray-400">Ready to create scene</span>
                  )}
                </div>
                <button
                  onClick={handleSaveAsScene}
                  disabled={selectedJobs.size < 2}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
                >
                  <Layers className="w-4 h-4" />
                  Save as Scene
                </button>
                <button
                  onClick={handleCancelSelect}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  onClick={handleToggleSelectMode}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
                >
                  <CheckSquare className="w-4 h-4" />
                  Select Multiple
                </button>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="border-b border-gray-800 p-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by prompt, model, or provider..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="running">Running</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Providers</option>
                {providers.map(provider => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>

              <button
                onClick={loadJobs}
                className="ml-auto px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-white flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Job Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p className="text-lg">No jobs found</p>
                {searchQuery || statusFilter !== 'all' || providerFilter !== 'all' ? (
                  <p className="text-sm mt-2">Try adjusting your filters</p>
                ) : (
                  <p className="text-sm mt-2">Start generating to see your history here</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredJobs.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onViewDetails={handleViewDetails}
                    onDelete={handleJobDeleted}
                    onPreload={handlePreload}
                    isDesktop={isDesktop}
                    selectMode={selectMode}
                    isSelected={selectedJobs.has(job.id)}
                    onToggleSelect={handleToggleJobSelection}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Job Detail Modal */}
      <JobDetailModal
        job={selectedJob}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onRetry={handleRetry}
        onCreateVariation={(job) => {
          setVariationParentJob(job);
          setShowVariationDialog(true);
        }}
        onSaveAsScene={saveJobAsScene}
        allJobs={jobs}
      />

      {/* Variation Dialog */}
      {showVariationDialog && variationParentJob && (
        <CreateJobVariationDialog
          parentJob={variationParentJob}
          onClose={() => {
            setShowVariationDialog(false);
            setVariationParentJob(null);
          }}
          onCreateVariation={async (parentJob, modifications) => {
            await createJobVariation(parentJob, modifications);
            await loadJobs(); // Reload to show new variation
          }}
        />
      )}

      {/* Save Multi-Output Scene Dialog */}
      {showSaveSceneDialog && (
        <SaveMultiOutputSceneDialog
          selectedJobIds={Array.from(selectedJobs)}
          jobs={jobs}
          onClose={() => setShowSaveSceneDialog(false)}
          onSave={async (sceneName) => {
            try {
              // Get the selected job objects
              const selectedJobObjects = jobs.filter(job => selectedJobs.has(job.id));

              // Validate all jobs are completed
              const incompletedJobs = selectedJobObjects.filter(job => job.status !== 'completed');
              if (incompletedJobs.length > 0) {
                alert('All selected jobs must be completed before creating a scene');
                return;
              }

              // Validate all jobs are same category
              const categories = new Set(
                selectedJobObjects.map(job => {
                  const jobData = typeof job.data === 'string' ? JSON.parse(job.data) : job.data;
                  return jobData.category;
                })
              );

              if (categories.size > 1) {
                alert('All selected jobs must be the same category (all images or all videos)');
                return;
              }

              const category = Array.from(categories)[0];

              // Create the multi-output scene
              await createSceneWithOutputs(sceneName, selectedJobObjects, category);

              // Reset select mode
              setSelectMode(false);
              setSelectedJobs(new Set());
              setShowSaveSceneDialog(false);

              alert('Multi-output scene created successfully!');
            } catch (error) {
              console.error('Failed to create multi-output scene:', error);
              alert('Failed to create scene: ' + error.message);
            }
          }}
        />
      )}
    </>
  );
}
