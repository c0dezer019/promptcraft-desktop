import { useState, useEffect, useCallback } from 'react';
import { usePlatform } from '@promptcraft/ui/hooks/usePlatform.js';
import {
  IMAGE_MODELS,
  VIDEO_MODELS,
  DEFAULT_MODELS,
  getAllModels,
  getModelById,
  getModelTier
} from '../constants/models.js';

/**
 * Hook for managing AI generation providers
 * Lists available providers and their configurations
 *
 * LOCAL OVERRIDE: Updated for new model tier system
 */
export function useProviders() {
  const { isDesktop } = usePlatform();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load available providers
   */
  const loadProviders = useCallback(async () => {
    if (!isDesktop) return;

    setLoading(true);
    setError(null);

    try {
      const { invoke } = window.__TAURI__.core;
      const providerList = await invoke('list_providers');
      setProviders(providerList);
    } catch (err) {
      console.error('Failed to load providers:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isDesktop]);

  /**
   * Check if a specific provider is available
   */
  const isProviderAvailable = useCallback((providerName) => {
    return providers.includes(providerName);
  }, [providers]);

  /**
   * Get provider display name
   */
  const getProviderDisplayName = useCallback((providerName) => {
    const names = {
      'openai': 'OpenAI',
      'google': 'Google Veo',
      'grok': 'Grok (xAI)',
      'runway': 'Runway',
      'luma': 'Luma AI',
      'hailuo': 'Hailuo',
      'local': 'Local',
      'none': 'N/A',
    };
    return names[providerName] || providerName;
  }, []);

  /**
   * Get default model for a category (Standard tier)
   */
  const getDefaultModel = useCallback((category) => {
    return DEFAULT_MODELS[category] || DEFAULT_MODELS.image;
  }, []);

  /**
   * Get all models for a category
   */
  const getModelsByCategory = useCallback((category) => {
    return getAllModels(category);
  }, []);

  /**
   * Get models grouped by tier for a category
   */
  const getModelsByTier = useCallback((category) => {
    return category === 'image' ? IMAGE_MODELS : VIDEO_MODELS;
  }, []);

  /**
   * Get tier for a specific model
   */
  const getModelTierInfo = useCallback((modelId) => {
    return getModelTier(modelId);
  }, []);

  /**
   * Get model configuration by ID
   */
  const getModelConfig = useCallback((modelId) => {
    return getModelById(modelId);
  }, []);

  // Auto-load providers on mount
  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  return {
    providers,
    loading,
    error,
    loadProviders,
    isProviderAvailable,
    getProviderDisplayName,
    getDefaultModel,
    getModelsByCategory,
    getModelsByTier,
    getModelTierInfo,
    getModelConfig,
  };
}
