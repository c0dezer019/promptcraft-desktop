import React from 'react';
import { X, CheckCircle2, XCircle, Loader2, Clock, Download, RefreshCw, Copy, Check, Save } from 'lucide-react';
import { downloadJobResult } from '../../utils/downloadHelper';
import { usePlatform } from '../../lib/promptcraft-ui/hooks/usePlatform';
import { isValidImageUrl } from '../../utils/urlValidator';
import { convertToAssetUrl } from '../../utils/fileUrlHelper';

const StatusIcon = ({ status }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case 'failed':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'running':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'pending':
      return <Clock className="w-5 h-5 text-yellow-500" />;
    default:
      return <Clock className="w-5 h-5 text-gray-500" />;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};

const formatDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 'N/A';
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end - start;
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
};

const CopyableField = ({ label, value }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>
      <div className="text-sm text-gray-400 bg-gray-800 p-2 rounded break-all">
        {value || 'N/A'}
      </div>
    </div>
  );
};

export default function JobDetailModal({ job, isOpen, onClose, onRetry }) {
  const { isDesktop } = usePlatform();
  const [downloading, setDownloading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [showImage, setShowImage] = React.useState(false);

  // Memoize parsed job data to avoid re-parsing on every render
  const jobData = React.useMemo(() => {
    console.time('[JobDetailModal] Parse job data');
    if (!job?.data) return null;
    const result = typeof job.data === 'string' ? JSON.parse(job.data) : job.data;
    console.timeEnd('[JobDetailModal] Parse job data');
    return result;
  }, [job?.data]);

  // Lazy parse job result only when needed (it contains the huge base64 image)
  const jobResult = React.useMemo(() => {
    console.time('[JobDetailModal] Parse job result');
    if (!job?.result) {
      console.timeEnd('[JobDetailModal] Parse job result');
      return null;
    }

    // Only parse if we're showing the image, otherwise defer
    if (!showImage || !isOpen) {
      console.timeEnd('[JobDetailModal] Parse job result');
      return null;
    }

    const result = typeof job.result === 'string' ? JSON.parse(job.result) : job.result;
    console.timeEnd('[JobDetailModal] Parse job result');
    return result;
  }, [job?.result, showImage, isOpen]);

  // Memoize image source to avoid recalculating on every render
  const imageSource = React.useMemo(() => {
    console.time('[JobDetailModal] Calculate image source');

    // Validate the output URL to prevent XSS
    const safeOutputUrl = jobResult?.output_url && isValidImageUrl(jobResult.output_url)
      ? jobResult.output_url
      : null;

    // Handle base64 output_data (for providers like Gemini that return inline data)
    const base64Data = jobResult?.output_data;
    const rawImageSource = safeOutputUrl || (base64Data ? `data:image/png;base64,${base64Data}` : null);

    // Convert file:// URLs to Tauri asset protocol URLs
    const result = isDesktop && rawImageSource ? convertToAssetUrl(rawImageSource) : rawImageSource;

    console.timeEnd('[JobDetailModal] Calculate image source');
    return result;
  }, [jobResult?.output_url, jobResult?.output_data, isDesktop]);

  // Memoize stringified JSON to avoid re-stringifying on every render
  const parametersJson = React.useMemo(() => {
    return jobData?.parameters ? JSON.stringify(jobData.parameters, null, 2) : null;
  }, [jobData?.parameters]);

  const metadataJson = React.useMemo(() => {
    return jobResult?.metadata ? JSON.stringify(jobResult.metadata, null, 2) : null;
  }, [jobResult?.metadata]);

  // Reset image loaded state when job changes OR when modal closes
  React.useEffect(() => {
    setImageLoaded(false);
    setShowImage(false);
  }, [job?.id, isOpen]);

  // Defer image rendering with a longer delay to allow modal to render first
  React.useEffect(() => {
    if (isOpen && job) {
      // Use setTimeout instead of rAF for a longer delay
      const timeout = setTimeout(() => {
        setShowImage(true);
      }, 100); // 100ms delay to let modal paint first
      return () => clearTimeout(timeout);
    }
  }, [isOpen, job?.id]);

  // Log render timing
  React.useEffect(() => {
    if (isOpen && job) {
      console.log('[JobDetailModal] Modal rendered for job:', job.id);
      console.log('[JobDetailModal] Image source length:', imageSource?.length);
      console.log('[JobDetailModal] Parameters JSON length:', parametersJson?.length);
    }
  }, [isOpen, job?.id, imageSource, parametersJson]);

  if (!isOpen || !job) return null;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadJobResult(job, isDesktop);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download image: ' + error.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry(job);
      onClose();
    }
  };

  const handleSaveAsScene = async () => {
    if (!isDesktop || job.status !== 'completed') {
      console.log('[JobDetailModal] Cannot save scene - isDesktop:', isDesktop, 'status:', job.status);
      return;
    }

    try {
      setSaving(true);
      console.log('[JobDetailModal] Starting save as scene for job:', job.id);
      console.log('[JobDetailModal] Job data:', jobData);
      console.log('[JobDetailModal] Job result:', jobResult);

      // Determine category from job data or default to 'image'
      const category = jobData.type || 'image';

      // Create thumbnail from output_data or output_url
      const thumbnail = jobResult?.output_data
        ? `data:image/png;base64,${jobResult.output_data}`
        : jobResult?.output_url || null;

      console.log('[JobDetailModal] Thumbnail length:', thumbnail?.length);

      // Create scene data structure
      const sceneData = {
        category,
        model: jobData.model,
        provider: jobData.provider,
        prompt: {
          main: jobData.prompt,
          params: jobData.parameters || {},
        },
        metadata: {
          jobId: job.id,
          createdAt: job.created_at,
        },
      };

      // Generate a default name based on prompt
      const promptPreview = jobData.prompt?.substring(0, 50) || 'Generation';
      const sceneName = `${promptPreview}${jobData.prompt?.length > 50 ? '...' : ''}`;

      console.log('[JobDetailModal] Creating scene:', sceneName, 'with data:', sceneData);

      // Call Tauri backend directly instead of using useScenes hook
      const { invoke } = await import('@tauri-apps/api/core');
      const workflowId = job.workflow_id || 'default';

      const result = await invoke('create_scene', {
        input: {
          workflow_id: workflowId,
          name: sceneName,
          data: sceneData,
          thumbnail,
        },
      });

      console.log('[JobDetailModal] Scene created successfully:', result);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('[JobDetailModal] Failed to save scene - Full error:', error);
      console.error('[JobDetailModal] Error message:', error?.message);
      console.error('[JobDetailModal] Error stack:', error?.stack);
      alert('Failed to save as scene: ' + (error?.message || error?.toString() || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon status={job.status} />
            <div>
              <h2 className="text-lg font-semibold text-white">Job Details</h2>
              <p className="text-sm text-gray-400">ID: {job.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Result Preview */}
          {imageSource && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Result</label>
              <div className="relative group min-h-[200px]">
                {(!showImage || !imageLoaded) && (
                  <div className="w-full h-64 flex items-center justify-center bg-gray-800 rounded-lg border border-gray-700">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                )}
                {showImage && (
                  <img
                    src={imageSource}
                    alt="Generation result"
                    className={`w-full rounded-lg border border-gray-700 ${imageLoaded ? 'block' : 'hidden'}`}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onLoad={() => setImageLoaded(true)}
                    onError={(e) => {
                      console.error('Failed to load image:', imageSource?.substring(0, 100));
                      setImageLoaded(true);
                    }}
                  />
                )}
                {imageLoaded && showImage && (
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {downloading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Download
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Status</label>
              <div className="flex items-center gap-2">
                <StatusIcon status={job.status} />
                <span className="text-sm text-gray-400 capitalize">{job.status}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Type</label>
              <div className="text-sm text-gray-400 capitalize">{job.type}</div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Created</label>
              <div className="text-sm text-gray-400">{formatDate(job.created_at)}</div>
            </div>

            {job.started_at && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">Started</label>
                <div className="text-sm text-gray-400">{formatDate(job.started_at)}</div>
              </div>
            )}

            {job.completed_at && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">Completed</label>
                <div className="text-sm text-gray-400">{formatDate(job.completed_at)}</div>
              </div>
            )}

            {job.started_at && job.completed_at && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">Duration</label>
                <div className="text-sm text-gray-400">
                  {formatDuration(job.started_at, job.completed_at)}
                </div>
              </div>
            )}
          </div>

          {/* Generation Parameters */}
          <div className="space-y-4">
            <h3 className="text-md font-semibold text-white">Generation Parameters</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">Provider</label>
                <div className="text-sm text-gray-400 capitalize">{jobData?.provider || 'N/A'}</div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">Model</label>
                <div className="text-sm text-gray-400">{jobData?.model || 'N/A'}</div>
              </div>
            </div>

            <CopyableField label="Prompt" value={jobData?.prompt} />

            {parametersJson && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">Parameters</label>
                <div className="text-sm text-gray-400 bg-gray-800 p-3 rounded overflow-x-auto">
                  <pre>{parametersJson}</pre>
                </div>
              </div>
            )}
          </div>

          {/* Error Information */}
          {job.status === 'failed' && job.error && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-red-400">Error</label>
              <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 p-3 rounded">
                {job.error}
              </div>
            </div>
          )}

          {/* Metadata */}
          {metadataJson && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Metadata</label>
              <div className="text-sm text-gray-400 bg-gray-800 p-3 rounded overflow-x-auto">
                <pre>{metadataJson}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-4 flex justify-between gap-3">
          <div className="flex gap-3">
            {job.status === 'completed' && isDesktop && (
              <button
                onClick={handleSaveAsScene}
                disabled={saving || saved}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save as Scene
                  </>
                )}
              </button>
            )}
            {job.status === 'failed' && onRetry && (
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
