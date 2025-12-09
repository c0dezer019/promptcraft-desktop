import { getItem, setItem } from './storage.js';

/**
 * AI API Helper - Supports multiple providers
 * @param {string} userQuery - The user's prompt/query
 * @param {string} systemInstruction - System instruction for the AI
 * @returns {Promise<string>} - AI response text
 */
export const callAI = async (userQuery, systemInstruction) => {
  // 1. Load Settings
  let settings = await getItem('promptcraft_ai_settings', { provider: 'gemini', key: '', model: '', baseUrl: '' });

  // Fallback for legacy key if no new settings
  if (!settings.key) {
    const legacyKey = await getItem('promptcraft_gemini_key', null);
    if (legacyKey) settings = { provider: 'gemini', key: legacyKey, model: '', baseUrl: '' };
  }

  if (!settings.key && settings.provider !== 'custom') {
    return "Error: No API Key found. Please configure your AI Provider in Settings.";
  }

  try {
    let responseText = "";

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
        if (!geminiRes.ok) throw new Error((await geminiRes.json()).error?.message || geminiRes.statusText);
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
        if (!openAiRes.ok) {
          const err = await openAiRes.json();
          throw new Error(err.error?.message || `OpenAI Error: ${openAiRes.status}`);
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
        if (!anthropicRes.ok) {
          const err = await anthropicRes.json();
          throw new Error(err.error?.message || `Anthropic Error: ${anthropicRes.status}`);
        }
        const anthropicData = await anthropicRes.json();
        responseText = anthropicData.content?.[0]?.text;
        break;

      default:
        return "Error: Unknown provider selected.";
    }

    return responseText || "Error: No content generated.";

  } catch (error) {
    return `Error: ${error.message}`;
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
  return { provider: 'gemini', key: '', model: '', baseUrl: '' };
};

/**
 * Save AI settings to storage
 * @param {object} settings - Settings object
 * @returns {Promise<void>}
 */
export const saveAISettings = async (settings) => {
  await setItem('promptcraft_ai_settings', settings);
};
