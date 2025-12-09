import { useState, useEffect, useCallback } from 'react';
import { usePlatform } from './usePlatform.js';
import { invoke } from '../utils/tauri.js';

/**
 * Hook for managing workflows in desktop mode
 * Provides CRUD operations for workflows with auto-sync
 */
export function useWorkflows() {
  const { isDesktop } = usePlatform();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load workflows from database
  const loadWorkflows = useCallback(async () => {
    if (!isDesktop) return;

    setLoading(true);
    setError(null);

    try {
      const data = await invoke('list_workflows');
      setWorkflows(data);
    } catch (err) {
      console.error('Failed to load workflows:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isDesktop]);

  // Create a new workflow
  const createWorkflow = useCallback(async (name, type, data) => {
    if (!isDesktop) return null;

    try {
      const workflow = await invoke('create_workflow', {
        input: { name, type, data }
      });
      setWorkflows(prev => [workflow, ...prev]);
      return workflow;
    } catch (err) {
      console.error('Failed to create workflow:', err);
      setError(err.message);
      return null;
    }
  }, [isDesktop]);

  // Get a specific workflow
  const getWorkflow = useCallback(async (id) => {
    if (!isDesktop) return null;

    try {
      const workflow = await invoke('get_workflow', { id });
      return workflow;
    } catch (err) {
      console.error('Failed to get workflow:', err);
      setError(err.message);
      return null;
    }
  }, [isDesktop]);

  // Update a workflow
  const updateWorkflow = useCallback(async (id, updates) => {
    if (!isDesktop) return null;

    try {
      const workflow = await invoke('update_workflow', {
        id,
        input: updates
      });
      setWorkflows(prev =>
        prev.map(w => (w.id === id ? workflow : w))
      );
      return workflow;
    } catch (err) {
      console.error('Failed to update workflow:', err);
      setError(err.message);
      return null;
    }
  }, [isDesktop]);

  // Delete a workflow
  const deleteWorkflow = useCallback(async (id) => {
    if (!isDesktop) return false;

    try {
      await invoke('delete_workflow', { id });
      setWorkflows(prev => prev.filter(w => w.id !== id));
      return true;
    } catch (err) {
      console.error('Failed to delete workflow:', err);
      setError(err.message);
      return false;
    }
  }, [isDesktop]);

  // Auto-load workflows on mount
  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  return {
    workflows,
    loading,
    error,
    loadWorkflows,
    createWorkflow,
    getWorkflow,
    updateWorkflow,
    deleteWorkflow,
  };
}
