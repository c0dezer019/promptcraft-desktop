import { useState, useCallback, useEffect } from 'react';
import { usePlatform } from '@promptcraft/ui';

/**
 * Custom hook for managing scenes (generation history with metadata)
 * Integrates with Tauri backend SQLite database
 */
export function useScenes(workflowId = 'default') {
  const { isDesktop } = usePlatform();
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load all scenes for the current workflow
   */
  const loadScenes = useCallback(async () => {
    if (!isDesktop) {
      console.warn('Scenes are only available in desktop mode');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { invoke } = window.__TAURI__.core;
      const data = await invoke('list_scenes', { workflowId });

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
      const { invoke } = window.__TAURI__.core;
      const scene = await invoke('create_scene', {
        input: {
          workflowId,
          name,
          data: JSON.stringify(data),
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
      const { invoke } = window.__TAURI__.core;
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
      const { invoke } = window.__TAURI__.core;
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
   * Note: Backend doesn't have update_scene command yet, so we'll implement it
   * by recreating with the same ID (or you'll need to add the command to Tauri)
   */
  const updateScene = useCallback(async (sceneId, updates) => {
    if (!isDesktop) {
      throw new Error('Scenes are only available in desktop mode');
    }

    try {
      // For now, update local state only
      // TODO: Add update_scene Tauri command in backend
      setScenes(prev => prev.map(scene => {
        if (scene.id === sceneId) {
          return {
            ...scene,
            ...updates,
            data: typeof updates.data === 'object'
              ? { ...scene.data, ...updates.data }
              : scene.data,
          };
        }
        return scene;
      }));
    } catch (err) {
      console.error('Failed to update scene:', err);
      throw err;
    }
  }, [isDesktop]);

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
  };
}
