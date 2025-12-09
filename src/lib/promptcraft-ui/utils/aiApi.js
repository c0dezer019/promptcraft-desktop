import { getItem, setItem } from './storage.js';

/**
 * AI API Helper - Supports multiple providers
 * @param {string} userQuery - The user's prompt/query
 * @param {string} systemInstruction - System instruction for the AI
 * @returns {Promise<string>} - AI response text
 */
export const callAI = async (userQuery, systemInstruction) => {
  // 1. Load Settings
  let settings = await getItem('promptcraft_ai_settings', { provider: 'openai', key: '', model: '', baseUrl: '' });

  // Fallback for legacy key if no new settings
  if (!settings.key) {
    const legacyKey = await getItem('promptcraft_gemini_key', null);
    if (legacyKey) settings = { provider: 'gemini', key: legacyKey, model: '', baseUrl: '' };
  }

  if (!settings.key && settings.provider !== 'custom') {
    throw new Error(`No API key configured for ${settings.provider}. Please configure it in Settings → Enhancement tab.`);
  }

  try {
    let responseText = "";
    let response;
    let statusCode;

    switch (settings.provider) {
      case 'gemini':
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model || 'gemini-2.5-flash-preview-09-2025'}:generateContent?key=${settings.key}`;
        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] }
          })
        });
        statusCode = geminiRes.status;
        if (!geminiRes.ok) {
          const errorData = await geminiRes.json();
          const errorMsg = errorData.error?.message || geminiRes.statusText;
          throw new Error(`${statusCode === 403 ? 'Access denied' : statusCode === 401 ? 'Authentication failed' : 'Error'}: ${errorMsg}`);
        }
        const geminiData = await geminiRes.json();
        responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        break;

      case 'openai': // Compatible with DeepSeek, Mistral, LocalAI, etc if BaseURL changed
        const baseUrl = settings.baseUrl ? settings.baseUrl.replace(/\/$/, '') : 'https://api.openai.com/v1';
        const openAiRes = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.key}`
          },
          body: JSON.stringify({
            model: settings.model || 'gpt-4o',
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: userQuery }
            ]
          })
        });
        statusCode = openAiRes.status;
        if (!openAiRes.ok) {
          const err = await openAiRes.json();
          const errorMsg = err.error?.message || `OpenAI Error: ${statusCode}`;
          throw new Error(`${statusCode === 403 ? 'Access denied' : statusCode === 401 ? 'Authentication failed' : 'Error'}: ${errorMsg}`);
        }
        const openAiData = await openAiRes.json();
        responseText = openAiData.choices?.[0]?.message?.content;
        break;

      case 'anthropic':
        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': settings.key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'dangerously-allow-browser-only': 'true'
          },
          body: JSON.stringify({
            model: settings.model || 'claude-sonnet-4-20250514',
            system: systemInstruction,
            messages: [{ role: 'user', content: userQuery }],
            max_tokens: 1024
          })
        });
        statusCode = anthropicRes.status;
        if (!anthropicRes.ok) {
          const err = await anthropicRes.json();
          const errorMsg = err.error?.message || `Anthropic Error: ${statusCode}`;
          throw new Error(`${statusCode === 403 ? 'Access denied' : statusCode === 401 ? 'Authentication failed' : 'Error'}: ${errorMsg}`);
        }
        const anthropicData = await anthropicRes.json();
        responseText = anthropicData.content?.[0]?.text;
        break;

      default:
        throw new Error("Unknown provider selected.");
    }

    if (!responseText) {
      throw new Error("No content generated.");
    }

    return responseText;

  } catch (error) {
    // Enhanced error messages based on error type
    const errorMsg = error.message.toLowerCase();
    const provider = settings.provider;

    // Authentication errors
    if (errorMsg.includes('401') || errorMsg.includes('unauthorized') ||
        errorMsg.includes('invalid') || errorMsg.includes('authentication failed')) {
      throw new Error(`Authentication failed: Invalid API key for ${provider}. Please check your API key in Settings.`);
    }

    // Permission/quota errors
    if (errorMsg.includes('403') || errorMsg.includes('forbidden') ||
        errorMsg.includes('access denied') || errorMsg.includes('quota') ||
        errorMsg.includes('rate limit')) {
      throw new Error(`Access denied: Your ${provider} API key may have insufficient permissions or exceeded quota. Check your account at the provider's dashboard.`);
    }

    // Network errors
    if (errorMsg.includes('network') || errorMsg.includes('failed to fetch') ||
        errorMsg.includes('timeout')) {
      throw new Error(`Network error: Unable to reach ${provider} API. Check your internet connection.`);
    }

    // Re-throw with original message if no specific pattern matched
    throw error;
  }
};

/**
 * Load AI settings from storage
 * @returns {Promise<object>} Settings object
 */
export const loadAISettings = async () => {
  const stored = await getItem('promptcraft_ai_settings', null);
  if (stored) {
    return stored;
  }
  // Check for legacy key
  const legacy = await getItem('promptcraft_gemini_key', null);
  if (legacy) {
    return { provider: 'gemini', key: legacy, model: '', baseUrl: '' };
  }
  return { provider: 'openai', key: '', model: '', baseUrl: '' };
};

/**
 * Save AI settings to storage
 * @param {object} settings - Settings object
 * @returns {Promise<void>}
 */
export const saveAISettings = async (settings) => {
  await setItem('promptcraft_ai_settings', settings);
};
