import { useState, useEffect, useCallback } from 'react';
import { usePlatform } from '@promptcraft/ui/hooks/usePlatform.js';

/**
 * Hook for managing AI generation providers
 * Lists available providers and their configurations
 *
 * LOCAL OVERRIDE: Updated for gpt-image-1, Sora, Veo, and Grok
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
    };
    return names[providerName] || providerName;
  }, []);

  /**
   * Get default model for provider
   */
  const getDefaultModel = useCallback((providerName) => {
    const defaults = {
      'openai': 'gpt-image-1',
      'google': 'veo-3.1-generate-preview',
      'grok': 'grok-2-image',
    };
    return defaults[providerName] || 'default';
  }, []);

  /**
   * Get video model for provider (for video generation)
   */
  const getVideoModel = useCallback((providerName) => {
    const videoModels = {
      'openai': 'sora-2',
      'google': 'veo-3.1-generate-preview',
    };
    return videoModels[providerName] || null;
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
    getVideoModel,
  };
}
