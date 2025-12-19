import { useState, useCallback, useEffect } from 'react';
import { usePlatform } from '../lib/promptcraft-ui';
import { invoke } from '@tauri-apps/api/core';
import { getModelProvider } from '../constants/models';

/**
 * Custom hook for managing scenes (generation history with metadata)
 * Integrates with Tauri backend SQLite database
 * @param {string} workflowId - Workflow ID to load scenes for, or 'all' to load all scenes
 */
export function useScenes(workflowId = 'default') {
  const { isDesktop } = usePlatform();
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load scenes (all or for specific workflow)
   */
  const loadScenes = useCallback(async () => {
    if (!isDesktop) {
      console.warn('Scenes are only available in desktop mode');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use list_all_scenes if workflowId is 'all', otherwise list_scenes for specific workflow
      const data = workflowId === 'all'
        ? await invoke('list_all_scenes')
        : await invoke('list_scenes', { workflowId });

      // Parse JSON data field for each scene
      const parsedScenes = data.map(scene => ({
        ...scene,
        data: typeof scene.data === 'string' ? JSON.parse(scene.data) : scene.data,
      }));

      setScenes(parsedScenes);
    } catch (err) {
      console.error('Failed to load scenes:', err);
      setError(err.message || 'Failed to load scenes');
    } finally {
      setLoading(false);
    }
  }, [isDesktop, workflowId]);

  /**
   * Create a new scene
   * @param {string} name - Scene name/title
   * @param {object} data - Scene data (prompt, settings, metadata, etc.)
   * @param {string} thumbnail - Base64 image or file path
   */
  const createScene = useCallback(async (name, data, thumbnail = null) => {
    if (!isDesktop) {
      throw new Error('Scenes are only available in desktop mode');
    }

    try {
      // Always use 'default' workflow when creating scenes, even if we're viewing 'all'
      const targetWorkflowId = workflowId === 'all' ? 'default' : workflowId;

      const scene = await invoke('create_scene', {
        input: {
          workflow_id: targetWorkflowId,
          name,
          data,
          thumbnail,
        },
      });

      // Add new scene to state
      const parsedScene = {
        ...scene,
        data: typeof scene.data === 'string' ? JSON.parse(scene.data) : scene.data,
      };

      setScenes(prev => [parsedScene, ...prev]);
      return parsedScene;
    } catch (err) {
      console.error('Failed to create scene:', err);
      throw err;
    }
  }, [isDesktop, workflowId]);

  /**
   * Delete a scene
   * @param {string} sceneId - Scene ID to delete
   */
  const deleteScene = useCallback(async (sceneId) => {
    if (!isDesktop) {
      throw new Error('Scenes are only available in desktop mode');
    }

    try {
      await invoke('delete_scene', { id: sceneId });

      // Remove from state
      setScenes(prev => prev.filter(scene => scene.id !== sceneId));
    } catch (err) {
      console.error('Failed to delete scene:', err);
      throw err;
    }
  }, [isDesktop]);

  /**
   * Get jobs associated with a scene
   * @param {string} sceneId - Scene ID
   */
  const getSceneJobs = useCallback(async (sceneId) => {
    if (!isDesktop) {
      return [];
    }

    try {
      const jobs = await invoke('list_jobs', { workflowId });

      // Filter jobs that belong to this scene
      return jobs.filter(job => job.scene_id === sceneId);
    } catch (err) {
      console.error('Failed to load scene jobs:', err);
      return [];
    }
  }, [isDesktop, workflowId]);

  /**
   * Update scene metadata (name, tags, etc.)
   */
  const updateScene = useCallback(async (sceneId, updates) => {
    if (!isDesktop) {
      throw new Error('Scenes are only available in desktop mode');
    }

    try {
      const scene = await invoke('update_scene', {
        id: sceneId,
        input: updates,
      });

      // Parse and update local state
      const parsedScene = {
        ...scene,
        data: typeof scene.data === 'string' ? JSON.parse(scene.data) : scene.data,
      };

      setScenes(prev => prev.map(s => s.id === sceneId ? parsedScene : s));
      return parsedScene;
    } catch (err) {
      console.error('Failed to update scene:', err);
      throw err;
    }
  }, [isDesktop]);

  /**
   * Create a variation of an existing scene
   * Copies scene data but marks it as a variation and triggers generation
   */
  const createVariation = useCallback(async (parentScene, modifications = {}) => {
    if (!isDesktop) {
      throw new Error('Scenes are only available in desktop mode');
    }

    const { data, thumbnail } = parentScene;

    // Create new scene data with parent reference
    const variationData = {
      ...data,
      prompt: {
        ...data.prompt,
        ...modifications.prompt,
      },
      metadata: {
        ...data.metadata,
        variationOf: parentScene.id,
        tags: [...(data.metadata?.tags || []), 'variation'].filter((v, i, a) => a.indexOf(v) === i),
        ...modifications.metadata,
      },
    };

    const variationName = modifications.name || `${parentScene.name} - Variation`;

    // Create the variation scene without thumbnail initially
    // The thumbnail will be updated when generation completes
    const newScene = await createScene(variationName, variationData, null);

    // Auto-trigger generation
    try {
      // Use the actual workflow_id from the parent scene or default
      const targetWorkflowId = parentScene.workflow_id || 'default';

      // Get the correct provider name from the model
      const provider = getModelProvider(data.model) || 'openai';

      // Prepare parameters
      let parameters = { ...(data.params || {}) };

      // If using parent as reference, convert thumbnail to base64
      if (modifications.useAsReference && parentScene.thumbnail) {
        try {
          const base64Data = await invoke('image_to_base64', { path: parentScene.thumbnail });

          // Add to reference_images array (new multi-image format)
          parameters.reference_images = [{
            data: base64Data,
            strength: 0.75,
            denoisingStrength: 0.7,
          }];

          console.log('[createVariation] Added parent image as reference');
        } catch (err) {
          console.error('[createVariation] Failed to load reference image:', err);
          // Continue without reference image
        }
      }

      const jobData = {
        workflow_id: targetWorkflowId,
        scene_id: newScene.id,
        type: 'generation',
        data: {
          provider,
          model: data.model,
          prompt: variationData.prompt.main,
          negative_prompt: variationData.prompt.negative,
          parameters,
        },
      };

      const job = await invoke('create_job', { input: jobData });

      // Link job to variation scene
      const updatedData = {
        ...variationData,
        jobs: [job.id],
      };

      await invoke('update_scene', {
        id: newScene.id,
        input: { data: updatedData },
      });

      console.log('[createVariation] Generation job created:', job.id);
    } catch (err) {
      console.error('[createVariation] Failed to trigger generation:', err);
      // Continue - variation scene still exists even if generation fails
    }

    return newScene;
  }, [isDesktop, workflowId, createScene]);

  /**
   * Create a new sequence or add scenes to existing sequence
   */
  const createSequence = useCallback(async (sceneIds, sequenceId = null) => {
    if (!isDesktop) {
      throw new Error('Scenes are only available in desktop mode');
    }

    // Validate all scenes are same category
    const scenesToUpdate = scenes.filter(s => sceneIds.includes(s.id));
    if (scenesToUpdate.length === 0) {
      throw new Error('No valid scenes found');
    }

    const firstCategory = scenesToUpdate[0].data?.category;
    const allSameCategory = scenesToUpdate.every(s => s.data?.category === firstCategory);

    if (!allSameCategory) {
      throw new Error('All scenes in a sequence must be the same category');
    }

    const sequenceUuid = sequenceId || crypto.randomUUID();

    // Update each scene with sequence metadata
    const updatePromises = sceneIds.map(async (sceneId, index) => {
      const scene = scenes.find(s => s.id === sceneId);
      if (!scene) return null;

      const updatedData = {
        ...scene.data,
        metadata: {
          ...scene.data.metadata,
          sequenceId: sequenceUuid,
          sequenceOrder: index,
          tags: [...(scene.data.metadata?.tags || []), 'sequence'].filter((v, i, a) => a.indexOf(v) === i),
        },
      };

      return await invoke('update_scene', {
        id: sceneId,
        input: { data: updatedData },
      });
    });

    await Promise.all(updatePromises);

    // Refresh scenes to reflect changes
    await loadScenes();

    return sequenceUuid;
  }, [isDesktop, scenes, loadScenes]);

  /**
   * Search and filter scenes
   * @param {object} filters - Filter criteria
   */
  const filterScenes = useCallback((filters = {}) => {
    let filtered = [...scenes];

    // Search by name or prompt
    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(scene =>
        scene.name.toLowerCase().includes(query) ||
        scene.data?.prompt?.main?.toLowerCase().includes(query)
      );
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(scene =>
        filters.tags.some(tag =>
          scene.data?.metadata?.tags?.includes(tag)
        )
      );
    }

    // Filter by model
    if (filters.model) {
      filtered = filtered.filter(scene =>
        scene.data?.model === filters.model
      );
    }

    // Filter by category (image/video)
    if (filters.category) {
      filtered = filtered.filter(scene =>
        scene.data?.category === filters.category
      );
    }

    // Sort by date (newest first by default)
    filtered.sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );

    return filtered;
  }, [scenes]);

  // Auto-load scenes on mount
  useEffect(() => {
    if (isDesktop) {
      loadScenes();
    }
  }, [isDesktop, loadScenes]);

  return {
    scenes,
    loading,
    error,
    loadScenes,
    createScene,
    deleteScene,
    updateScene,
    getSceneJobs,
    filterScenes,
    createVariation,
    createSequence,
  };
}
