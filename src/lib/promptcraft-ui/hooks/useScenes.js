import { useState, useEffect, useCallback } from 'react';
import { usePlatform } from './usePlatform.js';
import { invoke } from '../utils/tauri.js';

/**
 * Hook for managing scenes (workflow snapshots)
 * Provides operations for scene management with auto-sync
 */
export function useScenes(workflowId) {
  const { isDesktop } = usePlatform();
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load scenes for a workflow
  const loadScenes = useCallback(async () => {
    if (!isDesktop || !workflowId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await invoke('list_scenes', { workflowId });
      setScenes(data);
    } catch (err) {
      console.error('Failed to load scenes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isDesktop, workflowId]);

  // Create a new scene
  const createScene = useCallback(async (name, data, thumbnail = null) => {
    if (!isDesktop || !workflowId) return null;

    try {
      const scene = await invoke('create_scene', {
        input: {
          workflow_id: workflowId,
          name,
          data,
          thumbnail
        }
      });
      setScenes(prev => [scene, ...prev]);
      return scene;
    } catch (err) {
      console.error('Failed to create scene:', err);
      setError(err.message);
      return null;
    }
  }, [isDesktop, workflowId]);

  // Delete a scene
  const deleteScene = useCallback(async (id) => {
    if (!isDesktop) return false;

    try {
      await invoke('delete_scene', { id });
      setScenes(prev => prev.filter(s => s.id !== id));
      return true;
    } catch (err) {
      console.error('Failed to delete scene:', err);
      setError(err.message);
      return false;
    }
  }, [isDesktop]);

  // Auto-load scenes when workflowId changes
  useEffect(() => {
    loadScenes();
  }, [loadScenes]);

  return {
    scenes,
    loading,
    error,
    loadScenes,
    createScene,
    deleteScene,
  };
}
