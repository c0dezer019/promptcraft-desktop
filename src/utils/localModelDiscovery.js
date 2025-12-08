/**
 * Local Model Discovery Utilities
 * Fetches available models from local generation tool APIs
 */

import { fetch } from '@tauri-apps/plugin-http';

/**
 * Discover models from ComfyUI
 * @param {Object} config - Tool configuration with apiUrl
 * @returns {Promise<Array>} Array of model objects
 */
async function discoverComfyUIModels(config) {
  const { apiUrl } = config;

  try {
    // ComfyUI model endpoint - get checkpoints
    const response = await fetch(`${apiUrl}/object_info`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // ComfyUI stores model info in object_info under CheckpointLoaderSimple
    const checkpointLoader = data?.CheckpointLoaderSimple?.input?.required?.ckpt_name;

    if (checkpointLoader && Array.isArray(checkpointLoader[0])) {
      return checkpointLoader[0].map(modelName => ({
        id: modelName,
        name: modelName,
        type: 'checkpoint',
        backend: 'comfyui'
      }));
    }

    return [];
  } catch (error) {
    console.error('Failed to discover ComfyUI models:', error);
    throw error;
  }
}

/**
 * Discover models from Automatic1111
 * @param {Object} config - Tool configuration with apiUrl
 * @returns {Promise<Array>} Array of model objects
 */
async function discoverA1111Models(config) {
  const { apiUrl } = config;

  try {
    // A1111 SD models endpoint
    const response = await fetch(`${apiUrl}/sdapi/v1/sd-models`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const models = await response.json();

    return models.map(model => ({
      id: model.model_name || model.title,
      name: model.title || model.model_name,
      hash: model.hash,
      type: 'checkpoint',
      backend: 'a1111'
    }));
  } catch (error) {
    console.error('Failed to discover A1111 models:', error);
    throw error;
  }
}

/**
 * Discover models from InvokeAI
 * @param {Object} config - Tool configuration with apiUrl
 * @returns {Promise<Array>} Array of model objects
 */
async function discoverInvokeAIModels(config) {
  const { apiUrl } = config;

  try {
    // InvokeAI models endpoint
    const response = await fetch(`${apiUrl}/api/v1/models`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // InvokeAI returns models in different formats depending on version
    const models = Array.isArray(data) ? data : (data.models || []);

    return models.map(model => ({
      id: model.name || model.model_name,
      name: model.name || model.model_name,
      type: model.model_type || 'checkpoint',
      backend: 'invokeai'
    }));
  } catch (error) {
    console.error('Failed to discover InvokeAI models:', error);
    throw error;
  }
}

/**
 * Unified model discovery interface
 * @param {string} toolId - Tool identifier (comfyui, a1111, invokeai)
 * @param {Object} config - Tool configuration
 * @returns {Promise<Array>} Array of discovered models
 */
export async function discoverModels(toolId, config) {
  if (!config || !config.apiUrl) {
    throw new Error('Invalid configuration: apiUrl required');
  }

  switch (toolId) {
    case 'comfyui':
      return discoverComfyUIModels(config);
    case 'a1111':
      return discoverA1111Models(config);
    case 'invokeai':
      return discoverInvokeAIModels(config);
    default:
      throw new Error(`Unknown tool: ${toolId}`);
  }
}

/**
 * Get categorized models (group by type if possible)
 * @param {Array} models - Array of model objects
 * @returns {Object} Models grouped by type
 */
export function categorizeModels(models) {
  const categories = {
    checkpoint: [],
    lora: [],
    vae: [],
    other: []
  };

  models.forEach(model => {
    const type = model.type || 'checkpoint';
    if (categories[type]) {
      categories[type].push(model);
    } else {
      categories.other.push(model);
    }
  });

  return categories;
}

/**
 * Format model name for display (remove file extensions, clean up)
 * @param {string} modelName - Raw model name
 * @returns {string} Formatted display name
 */
export function formatModelName(modelName) {
  // Remove common extensions
  let name = modelName.replace(/\.(safetensors|ckpt|pt|bin)$/i, '');

  // Replace underscores and hyphens with spaces
  name = name.replace(/[_-]/g, ' ');

  // Capitalize first letter of each word
  name = name.replace(/\b\w/g, char => char.toUpperCase());

  return name;
}
