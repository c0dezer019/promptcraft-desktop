import { useState, useEffect, useCallback } from 'react';
import { usePlatform } from './usePlatform.js';
import { invoke } from '../utils/tauri.js';

/**
 * Hook for managing AI generation providers
 * Lists available providers and their configurations
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
      'openai': 'OpenAI (DALL-E)',
      'google': 'Google (Veo)',
      'midjourney': 'Midjourney',
      'grok': 'Grok (xAI)',
    };
    return names[providerName] || providerName;
  }, []);

  /**
   * Get default model for provider
   */
  const getDefaultModel = useCallback((providerName) => {
    const defaults = {
      'openai': 'dall-e-3',
      'google': 'veo',
      'midjourney': 'v6',
      'grok': 'grok-1',
    };
    return defaults[providerName] || 'default';
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
  };
}
