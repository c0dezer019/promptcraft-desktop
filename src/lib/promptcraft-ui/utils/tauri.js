/**
 * Tauri API wrapper for v1 and v2 compatibility
 * Automatically detects and uses the correct API version
 */

let invokeFunction = null;
let tauriVersion = null;

/**
 * Initialize Tauri invoke function
 * Call this once at app startup or lazy-load on first invoke
 */
async function initTauriInvoke() {
  if (invokeFunction) return invokeFunction;

  // Try Tauri v2 first
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    invokeFunction = invoke;
    tauriVersion = 2;
    console.log('[Tauri] Using Tauri v2 API');
    return invokeFunction;
  } catch (error) {
    // Not Tauri v2, try v1
  }

  // Try Tauri v1
  if (typeof window !== 'undefined' && window.__TAURI__?.core?.invoke) {
    invokeFunction = window.__TAURI__.core.invoke;
    tauriVersion = 1;
    console.log('[Tauri] Using Tauri v1 API');
    return invokeFunction;
  }

  // Not in Tauri environment
  throw new Error('Tauri API not available - are you running in desktop mode?');
}

/**
 * Invoke a Tauri command
 * Compatible with both Tauri v1 and v2
 * @param {string} command - Command name
 * @param {object} args - Command arguments
 * @returns {Promise<*>} Command result
 */
export async function invoke(command, args = {}) {
  if (!invokeFunction) {
    await initTauriInvoke();
  }

  try {
    return await invokeFunction(command, args);
  } catch (error) {
    console.error(`[Tauri] Failed to invoke '${command}':`, error);
    throw error;
  }
}

/**
 * Check if running in Tauri environment
 * @returns {Promise<boolean>}
 */
export async function isTauri() {
  try {
    await initTauriInvoke();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Tauri version being used
 * @returns {number|null} 1, 2, or null if not in Tauri
 */
export function getTauriVersion() {
  return tauriVersion;
}
