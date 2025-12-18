import { useState, useEffect, useCallback } from 'react';
import { usePlatform } from './usePlatform.js';
import { invoke } from '../utils/tauri.js';

/**
 * Hook for managing generation jobs
 * Provides operations for job queue management
 */
export function useJobs(workflowId) {
  const { isDesktop } = usePlatform();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load jobs for a workflow
  const loadJobs = useCallback(async () => {
    if (!isDesktop || !workflowId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await invoke('list_jobs', { workflowId });
      setJobs(data);
    } catch (err) {
      console.error('Failed to load jobs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isDesktop, workflowId]);

  // Create a new job
  const createJob = useCallback(async (type, data, sceneId = null) => {
    if (!isDesktop || !workflowId) return null;

    try {
      const job = await invoke('create_job', {
        input: {
          workflow_id: workflowId,
          scene_id: sceneId,
          type,
          data
        }
      });
      setJobs(prev => [job, ...prev]);
      return job;
    } catch (err) {
      console.error('Failed to create job:', err);
      setError(err.message);
      return null;
    }
  }, [isDesktop, workflowId]);

  // Get a specific job
  const getJob = useCallback(async (id) => {
    if (!isDesktop) return null;

    try {
      const job = await invoke('get_job', { id });
      return job;
    } catch (err) {
      console.error('Failed to get job:', err);
      setError(err.message);
      return null;
    }
  }, [isDesktop]);

  // Update a job
  const updateJob = useCallback(async (id, updates) => {
    if (!isDesktop) return null;

    try {
      const job = await invoke('update_job', {
        id,
        input: updates
      });
      setJobs(prev =>
        prev.map(j => (j.id === id ? job : j))
      );
      return job;
    } catch (err) {
      console.error('Failed to update job:', err);
      setError(err.message);
      return null;
    }
  }, [isDesktop]);

  // Auto-load jobs when workflowId changes
  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  return {
    jobs,
    loading,
    error,
    loadJobs,
    createJob,
    getJob,
    updateJob,
  };
}
