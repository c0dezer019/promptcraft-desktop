import { useState, useEffect, useCallback } from 'react';
import { discoverModels } from '../utils/localModelDiscovery.js';
import { getActiveTool } from '../utils/localToolConfig.js';

/**
 * useLocalModels Hook
 * Fetches and caches models from the active local tool
 */
export function useLocalModels() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000;

  /**
   * Fetch models from the active tool
   */
  const fetchModels = useCallback(async (force = false) => {
    // Check if we have a cached result
    if (!force && lastFetch && Date.now() - lastFetch < CACHE_DURATION) {
      return; // Use cached data
    }

    const activeTool = getActiveTool();

    if (!activeTool) {
      setModels([]);
      setError('No active local tool configured');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const discoveredModels = await discoverModels(activeTool.id, {
        apiUrl: activeTool.apiUrl,
        installPath: activeTool.installPath
      });

      setModels(discoveredModels);
      setLastFetch(Date.now());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch local models:', err);
      setError(err.message || 'Failed to connect to local tool');
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, [lastFetch, CACHE_DURATION]);

  /**
   * Refetch models (bypass cache)
   */
  const refetch = useCallback(() => {
    return fetchModels(true);
  }, [fetchModels]);

  /**
   * Auto-fetch on mount and when active tool changes
   */
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return {
    models,
    loading,
    error,
    refetch
  };
}
