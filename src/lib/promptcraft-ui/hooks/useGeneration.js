import { useState, useCallback } from 'react';
import { usePlatform } from './usePlatform.js';
import { useJobs } from './useJobs.js';
import { invoke } from '../utils/tauri.js';

/**
 * Hook for AI generation across different providers
 * Handles job submission and status tracking
 */
export function useGeneration(workflowId) {
  const { isDesktop } = usePlatform();
  const { jobs, loadJobs, createJob } = useJobs(workflowId);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Submit a generation request
   * @param {string} provider - Provider name (openai, google, midjourney, grok)
   * @param {string} prompt - Generation prompt
   * @param {string} model - Model to use (e.g., "dall-e-3")
   * @param {object} parameters - Provider-specific parameters
   * @returns {Promise<object|null>} Created job or null
   */
  const generate = useCallback(async (provider, prompt, model = 'default', parameters = {}) => {
    console.log('[useGeneration] Generate called:', { provider, prompt, model, parameters, isDesktop, workflowId });

    if (!isDesktop) {
      const errorMsg = 'Generation only available in desktop mode. Platform detection may have failed.';
      console.warn(errorMsg);
      setError(errorMsg);
      return null;
    }

    if (!workflowId) {
      setError('No workflow ID provided');
      return null;
    }

    setGenerating(true);
    setError(null);

    try {
      console.log('[useGeneration] Submitting generation to Tauri...');
      const job = await invoke('submit_generation', {
        workflowId,
        provider,
        prompt,
        model,
        parameters
      });

      console.log('[useGeneration] Job created:', job);

      // Reload jobs to show the new one
      await loadJobs();

      setGenerating(false);
      return job;
    } catch (err) {
      console.error('[useGeneration] Failed to submit generation:', err);
      setError(err.message || 'Generation failed');
      setGenerating(false);
      return null;
    }
  }, [isDesktop, workflowId, loadJobs]);

  /**
   * Get the latest generation job for this workflow
   */
  const getLatestJob = useCallback(() => {
    if (!jobs || jobs.length === 0) return null;
    return jobs[0]; // Jobs are ordered by created_at DESC
  }, [jobs]);

  /**
   * Get all completed generation jobs
   */
  const getCompletedJobs = useCallback(() => {
    if (!jobs) return [];
    return jobs.filter(job => job.status === 'completed');
  }, [jobs]);

  /**
   * Get all failed generation jobs
   */
  const getFailedJobs = useCallback(() => {
    if (!jobs) return [];
    return jobs.filter(job => job.status === 'failed');
  }, [jobs]);

  /**
   * Check if any job is currently running
   */
  const isGenerating = useCallback(() => {
    if (!jobs) return false;
    return jobs.some(job => job.status === 'running' || job.status === 'pending');
  }, [jobs]);

  return {
    generate,
    generating: generating || isGenerating(),
    error,
    jobs,
    latestJob: getLatestJob(),
    completedJobs: getCompletedJobs(),
    failedJobs: getFailedJobs(),
  };
}
