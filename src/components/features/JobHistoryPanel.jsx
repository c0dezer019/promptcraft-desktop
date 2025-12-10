import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Filter, Download, Trash2, CheckCircle2, XCircle, Loader2, Clock, RefreshCw, Eye } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useJobPolling } from '../../lib/promptcraft-ui/hooks/useJobPolling';
import { downloadJobResult } from '../../utils/downloadHelper';
import { usePlatform } from '../../lib/promptcraft-ui/hooks/usePlatform';
import JobDetailModal from './JobDetailModal';

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

const JobCard = ({ job, onViewDetails, onDownload, onDelete, isDesktop }) => {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const jobData = typeof job.data === 'string' ? JSON.parse(job.data) : job.data;
  const jobResult = job.result && typeof job.result === 'string' ? JSON.parse(job.result) : job.result;

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
    if (!confirm('Are you sure you want to delete this job?')) return;

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

  return (
    <div
      onClick={() => onViewDetails(job)}
      className="bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-all cursor-pointer group"
    >
      {/* Image Preview */}
      {jobResult?.output_url && (
        <div className="aspect-square relative overflow-hidden rounded-t-lg">
          <img
            src={jobResult.output_url}
            alt="Generation result"
            className="w-full h-full object-cover"
          />
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
    setSelectedJob(job);
    setShowDetailModal(true);
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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-800 p-4 flex items-center justify-between">
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
                  className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
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
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Providers</option>
                {providers.map(provider => (
                  <option key={provider} value={provider} className="capitalize">
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
                    isDesktop={isDesktop}
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
      />
    </>
  );
}
