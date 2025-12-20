import { useState, useCallback, useEffect } from 'react';
import { usePlatform } from '../lib/promptcraft-ui';
import { invoke } from '@tauri-apps/api/core';
import { getModelProvider } from '../constants/models';

/**
 * Custom hook for managing jobs (generation history)
 * Supports variations and sequences at the job level
 * @param {string} workflowId - Workflow ID to load jobs for, or 'all' to load all jobs
 */
export function useJobs(workflowId = 'default') {
  const { isDesktop } = usePlatform();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load jobs (all or for specific workflow)
   */
  const loadJobs = useCallback(async () => {
    if (!isDesktop) {
      console.warn('Jobs are only available in desktop mode');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let allJobs = [];

      if (workflowId === 'all') {
        // Load jobs for all workflows
        const workflows = await invoke('list_workflows');
        const jobPromises = workflows.map(workflow =>
          invoke('list_jobs', { workflowId: workflow.id })
        );
        const jobArrays = await Promise.all(jobPromises);
        allJobs = jobArrays.flat();
      } else {
        // Load jobs for specific workflow
        allJobs = await invoke('list_jobs', { workflowId });
      }

      // Parse JSON data field for each job
      const parsedJobs = allJobs.map(job => ({
        ...job,
        data: typeof job.data === 'string' ? JSON.parse(job.data) : job.data,
        result: job.result && typeof job.result === 'string' ? JSON.parse(job.result) : job.result,
      }));

      // Sort by creation date (newest first)
      parsedJobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setJobs(parsedJobs);
    } catch (err) {
      console.error('Failed to load jobs:', err);
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [isDesktop, workflowId]);

  /**
   * Create a variation of a job (generates new job marked as variation)
   * @param {object} parentJob - Parent job to create variation from
   * @param {object} modifications - Modifications to apply (prompt, parameters, etc.)
   */
  const createJobVariation = useCallback(async (parentJob, modifications = {}) => {
    if (!isDesktop) {
      throw new Error('Jobs are only available in desktop mode');
    }

    const { data } = parentJob;

    try {
      // Get the correct provider name from the model
      const provider = modifications.provider || data.provider || getModelProvider(data.model) || 'openai';

      // Prepare parameters
      let parameters = { ...(data.parameters || {}) };

      // If using parent as reference, get the output URL from parent job result
      if (modifications.useAsReference && parentJob.result?.output_url) {
        try {
          // Convert output URL to base64 for reference
          const base64Data = await invoke('image_to_base64', { path: parentJob.result.output_url });

          // Add to reference_images array (new multi-image format)
          parameters.reference_images = [{
            data: base64Data,
            strength: modifications.referenceStrength || 0.75,
            denoisingStrength: modifications.denoisingStrength || 0.7,
          }];

          console.log('[createJobVariation] Added parent image as reference');
        } catch (err) {
          console.error('[createJobVariation] Failed to load reference image:', err);
          // Continue without reference image
        }
      }

      // Merge parameters from modifications
      if (modifications.parameters) {
        parameters = { ...parameters, ...modifications.parameters };
      }

      // Create job data with variation metadata
      const jobData = {
        workflow_id: parentJob.workflow_id,
        scene_id: null, // Variations don't auto-create scenes
        type: 'generation',
        data: {
          provider,
          model: modifications.model || data.model,
          prompt: modifications.prompt?.main || data.prompt,
          negative_prompt: modifications.prompt?.negative || data.negative_prompt,
          parameters,
          // Variation metadata
          variationOf: parentJob.id,
          variationNotes: modifications.notes,
        },
      };

      const job = await invoke('create_job', { input: jobData });

      console.log('[createJobVariation] Variation job created:', job.id);

      // Reload jobs to include the new variation
      await loadJobs();

      return job;
    } catch (err) {
      console.error('[createJobVariation] Failed to create variation:', err);
      throw err;
    }
  }, [isDesktop, loadJobs]);


  /**
   * Save a job as a scene
   * @param {object} job - Job to save as scene
   * @param {string} sceneName - Name for the scene
   */
  const saveJobAsScene = useCallback(async (job, sceneName = null) => {
    if (!isDesktop) {
      throw new Error('Jobs are only available in desktop mode');
    }

    const { data, result } = job;

    // Use job result's output_url as thumbnail
    const thumbnail = result?.output_url || result?.output_data || null;

    const sceneData = {
      category: data.category || 'image',
      model: data.model,
      prompt: {
        main: data.prompt,
        negative: data.negative_prompt,
        modifiers: data.modifiers || [],
        params: data.parameters || {},
      },
      metadata: {
        tags: ['saved-from-history'],
        notes: data.variationNotes || '',
        sourceJobId: job.id,
        variationOf: data.variationOf, // Preserve variation relationship
        sequenceId: data.sequenceId, // Preserve sequence relationship
        sequenceOrder: data.sequenceOrder,
        sequenceName: data.sequenceName,
      },
      jobs: [job.id],
    };

    const name = sceneName || `Generation ${new Date(job.created_at).toLocaleDateString()}`;

    try {
      const scene = await invoke('create_scene', {
        input: {
          workflow_id: job.workflow_id,
          name,
          data: sceneData,
          thumbnail,
        },
      });

      console.log('[saveJobAsScene] Created scene from job:', scene.id);
      return scene;
    } catch (err) {
      console.error('[saveJobAsScene] Failed to save job as scene:', err);
      throw err;
    }
  }, [isDesktop]);

  /**
   * Delete a job
   * @param {string} jobId - Job ID to delete
   */
  const deleteJob = useCallback(async (jobId) => {
    if (!isDesktop) {
      throw new Error('Jobs are only available in desktop mode');
    }

    try {
      await invoke('delete_job', { jobId });

      // Remove from state
      setJobs(prev => prev.filter(job => job.id !== jobId));
    } catch (err) {
      console.error('Failed to delete job:', err);
      throw err;
    }
  }, [isDesktop]);

  // Auto-load jobs on mount
  useEffect(() => {
    if (isDesktop) {
      loadJobs();
    }
  }, [isDesktop, loadJobs]);

  return {
    jobs,
    loading,
    error,
    loadJobs,
    createJobVariation,
    saveJobAsScene,
    deleteJob,
  };
}
