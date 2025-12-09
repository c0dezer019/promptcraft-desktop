/**
 * Local Tool Configuration Utilities
 * Manages localStorage-based configuration for local generation tools
 */

const STORAGE_KEY = 'local_tool_configs';

/**
 * Default configuration structure for a tool
 */
const getDefaultToolConfig = () => ({
  enabled: false,
  installPath: null,
  apiUrl: null,
  lastConnected: null
});

/**
 * Load all local tool configurations from localStorage
 * @returns {Object} Tool configurations keyed by tool ID
 */
export function loadLocalToolConfigs() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {
        comfyui: getDefaultToolConfig(),
        a1111: getDefaultToolConfig(),
        invokeai: getDefaultToolConfig()
      };
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load local tool configs:', error);
    return {
      comfyui: getDefaultToolConfig(),
      a1111: getDefaultToolConfig(),
      invokeai: getDefaultToolConfig()
    };
  }
}

/**
 * Save configuration for a specific tool
 * @param {string} toolId - Tool identifier (comfyui, a1111, invokeai)
 * @param {Object} config - Tool configuration object
 */
export function saveLocalToolConfig(toolId, config) {
  try {
    const allConfigs = loadLocalToolConfigs();
    allConfigs[toolId] = {
      ...config,
      lastConnected: config.enabled ? new Date().toISOString() : null
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allConfigs));
    return true;
  } catch (error) {
    console.error('Failed to save local tool config:', error);
    return false;
  }
}

/**
 * Get configuration for a specific tool
 * @param {string} toolId - Tool identifier
 * @returns {Object} Tool configuration
 */
export function getLocalToolConfig(toolId) {
  const allConfigs = loadLocalToolConfigs();
  return allConfigs[toolId] || getDefaultToolConfig();
}

/**
 * Get list of all configured (enabled) tools
 * @returns {Array<Object>} Array of configured tools with their IDs and configs
 */
export function getConfiguredTools() {
  const allConfigs = loadLocalToolConfigs();
  return Object.entries(allConfigs)
    .filter(([_, config]) => config.enabled && config.apiUrl)
    .map(([id, config]) => ({ id, ...config }));
}

/**
 * Check if any local tool is configured
 * @returns {boolean} True if at least one tool is configured
 */
export function hasAnyConfiguredTool() {
  return getConfiguredTools().length > 0;
}

/**
 * Get the active (first enabled) tool
 * @returns {Object|null} Active tool config with ID, or null if none configured
 */
export function getActiveTool() {
  const configured = getConfiguredTools();
  return configured.length > 0 ? configured[0] : null;
}

/**
 * Delete configuration for a specific tool
 * @param {string} toolId - Tool identifier
 */
export function deleteLocalToolConfig(toolId) {
  try {
    const allConfigs = loadLocalToolConfigs();
    allConfigs[toolId] = getDefaultToolConfig();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allConfigs));
    return true;
  } catch (error) {
    console.error('Failed to delete local tool config:', error);
    return false;
  }
}
