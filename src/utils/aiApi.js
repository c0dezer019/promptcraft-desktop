/**
 * AI API wrapper for Tauri
 *
 * This overrides the @promptcraft/ui callAI function to route API calls
 * through the Tauri backend instead of making direct browser calls.
 * This avoids CORS issues with API providers like Anthropic.
 */

import { invoke } from '@tauri-apps/api/core';
import { getItem, setItem } from '../lib/promptcraft-ui/utils/storage.js';

/**
 * Call AI via Tauri backend
 * Signature matches @promptcraft/ui/utils/aiApi.js
 *
 * @param {string} userPrompt - The user's prompt/content to enhance
 * @param {string} systemPrompt - System instructions for the AI
 * @param {Object} options - Options for the AI call
 * @param {string} options.provider - The AI provider (e.g., 'anthropic', 'openai')
 * @param {string} options.model - The model to use (e.g., 'claude-3-5-sonnet-20241022')
 * @param {number} options.maxTokens - Maximum tokens to generate
 * @param {number} options.temperature - Temperature for generation (0-1)
 * @returns {Promise<string>} - The generated text
 */
export async function callAI(userPrompt, systemPrompt = '', options = {}) {
    // Load settings from storage to get the configured provider
    const settings = await getItem('promptcraft_ai_settings', {
        provider: 'openai',
        key: '',
        model: '',
        baseUrl: '',
    });

    // Provider-specific default models
    const getDefaultModel = (providerName) => {
        const defaults = {
            anthropic: 'claude-3-5-sonnet-20241022',
            openai: 'gpt-4o',
            gemini: 'gemini-2.0-flash-exp',
            minimax: 'abab6.5s-chat',
            venice: 'llama-3.3-70b',
        };
        return defaults[providerName] || 'gpt-4o';
    };

    // Use settings from localStorage, but allow options to override
    const {
        provider = settings.provider || 'openai',
        model = settings.model || getDefaultModel(settings.provider || 'openai'),
        maxTokens = 4096,
        temperature = 1.0,
    } = options;

    // Check if API key is configured
    if (!settings.key && provider === settings.provider) {
        throw new Error(
            `No API key configured for ${provider}. Please configure it in Settings → Enhancement tab.`
        );
    }

    // Combine system prompt and user prompt
    const fullPrompt = systemPrompt
        ? `${systemPrompt}\n\nUser request: ${userPrompt}`
        : userPrompt;

    // Check if running in Tauri environment
    try {
        console.log('[aiApi] Calling Tauri backend:', { provider, model });
        const result = await invoke('call_ai', {
            provider,
            model,
            prompt: fullPrompt,
            maxTokens,
            temperature,
        });
        console.log('[aiApi] Success! Received response');
        return result;
    } catch (error) {
        console.error('[aiApi] Tauri AI call failed:', error);

        // Parse error message to provide helpful feedback
        const errorStr = error.toString().toLowerCase();

        // Authentication errors (401, 403, invalid key)
        if (errorStr.includes('401') || errorStr.includes('unauthorized') ||
            errorStr.includes('invalid') || errorStr.includes('authentication')) {
            throw new Error(
                `Authentication failed: Invalid API key for ${provider}. Please check your API key in Settings.`
            );
        }

        // Permission/quota errors (403, quota exceeded)
        if (errorStr.includes('403') || errorStr.includes('forbidden') ||
            errorStr.includes('quota') || errorStr.includes('rate limit')) {
            throw new Error(
                `Access denied: Your ${provider} API key may have insufficient permissions or exceeded quota. Check your account at the provider's dashboard.`
            );
        }

        // Network errors
        if (errorStr.includes('network') || errorStr.includes('connection') ||
            errorStr.includes('timeout') || errorStr.includes('econnrefused')) {
            throw new Error(
                `Network error: Unable to reach ${provider} API. Check your internet connection.`
            );
        }

        // Model not found errors
        if (errorStr.includes('model') && (errorStr.includes('not found') || errorStr.includes('does not exist'))) {
            throw new Error(
                `Model error: The specified model "${model}" is not available for ${provider}. Try using a different model.`
            );
        }

        // Generic error with original message
        throw new Error(`AI call failed: ${error.message || error}`);
    }
}

/**
 * Load AI settings from storage (async)
 * This override uses the platform-agnostic storage system (Tauri Store or localStorage)
 *
 * @param {string} providerName - Optional provider name to load specific provider settings
 * @returns {Promise<Object>} Settings object with { provider, key, model, baseUrl }
 */
export async function loadAISettings(providerName = null) {
    if (providerName) {
        // Load settings for a specific provider
        const storageKey = `promptcraft_ai_settings_${providerName}`;
        const settings = await getItem(storageKey, null);

        if (settings) {
            return settings;
        }
        return { provider: providerName, key: '', model: '', baseUrl: '' };
    } else {
        // Load the currently active provider settings
        const settings = await getItem('promptcraft_ai_settings', null);

        if (settings) {
            return settings;
        }

        // Check for legacy Gemini key
        const legacyKey = await getItem('promptcraft_gemini_key', null);
        if (legacyKey) {
            return { provider: 'gemini', key: legacyKey, model: '', baseUrl: '' };
        }

        return { provider: 'openai', key: '', model: '', baseUrl: '' };
    }
}

/**
 * Save AI settings to storage (async)
 * This override uses the platform-agnostic storage system (Tauri Store or localStorage)
 *
 * @param {Object} settings - Settings object with { provider, key, model, baseUrl }
 * @returns {Promise<void>}
 */
export async function saveAISettings(settings) {
    // Save the main settings
    await setItem('promptcraft_ai_settings', settings);

    // Also save provider-specific settings for easy loading
    if (settings.provider && settings.key) {
        const providerKey = `promptcraft_ai_settings_${settings.provider}`;
        await setItem(providerKey, settings);
    }
}
