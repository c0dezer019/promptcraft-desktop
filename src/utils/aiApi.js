/**
 * AI API wrapper for Tauri
 *
 * This overrides the @promptcraft/ui callAI function to route API calls
 * through the Tauri backend instead of making direct browser calls.
 * This avoids CORS issues with API providers like Anthropic.
 */

import { invoke } from '@tauri-apps/api/core';

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
    // Load settings from localStorage to get the configured provider
    const settingsStr = localStorage.getItem('promptcraft_ai_settings');
    const settings = settingsStr
        ? JSON.parse(settingsStr)
        : { provider: 'anthropic', key: '', model: '', baseUrl: '' };

    // Provider-specific default models
    const getDefaultModel = (providerName) => {
        const defaults = {
            anthropic: 'claude-3-5-sonnet-20241022',
            openai: 'gpt-4o',
            gemini: 'gemini-2.0-flash-exp',
            minimax: 'abab6.5s-chat',
            venice: 'llama-3.3-70b',
        };
        return defaults[providerName] || 'claude-3-5-sonnet-20241022';
    };

    // Use settings from localStorage, but allow options to override
    const {
        provider = settings.provider || 'anthropic',
        model = settings.model || getDefaultModel(settings.provider || 'anthropic'),
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
        throw new Error(`AI call failed: ${error}`);
    }
}
