/**
 * Platform-agnostic storage utility
 * Works in both web (localStorage) and Tauri v2 (Store plugin)
 *
 * Usage:
 * - Web mode: Uses localStorage
 * - Desktop mode: Uses Tauri Store plugin for persistent storage
 */

let tauriStore = null;
let isDesktop = false;

/**
 * Initialize storage system
 * Call this once at app startup
 */
export async function initStorage() {
  if (typeof window === 'undefined') return;

  try {
    // Try to import Tauri v2 Store plugin
    // Use dynamic import string to prevent Vite from trying to resolve it at build time
    const pluginName = '@tauri-apps/plugin-store';
    const { Store } = await import(/* @vite-ignore */ pluginName);
    tauriStore = new Store('settings.json');
    isDesktop = true;
    console.log('[Storage] Initialized Tauri Store (desktop mode)');
  } catch (error) {
    // Fallback to web mode
    isDesktop = false;
    console.log('[Storage] Using localStorage (web mode)');
  }
}

/**
 * Get item from storage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {Promise<*>} Stored value or default
 */
export async function getItem(key, defaultValue = null) {
  if (isDesktop && tauriStore) {
    try {
      const value = await tauriStore.get(key);
      return value !== null && value !== undefined ? value : defaultValue;
    } catch (error) {
      console.error('[Storage] Failed to get item from Tauri Store:', error);
      return defaultValue;
    }
  } else {
    // Web mode: localStorage
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;

      // Try to parse as JSON, fallback to raw string
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    } catch (error) {
      console.error('[Storage] Failed to get item from localStorage:', error);
      return defaultValue;
    }
  }
}

/**
 * Set item in storage
 * @param {string} key - Storage key
 * @param {*} value - Value to store (will be JSON serialized)
 * @returns {Promise<void>}
 */
export async function setItem(key, value) {
  if (isDesktop && tauriStore) {
    try {
      await tauriStore.set(key, value);
      await tauriStore.save(); // Persist to disk
    } catch (error) {
      console.error('[Storage] Failed to set item in Tauri Store:', error);
      throw error;
    }
  } else {
    // Web mode: localStorage
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error('[Storage] Failed to set item in localStorage:', error);
      throw error;
    }
  }
}

/**
 * Remove item from storage
 * @param {string} key - Storage key
 * @returns {Promise<void>}
 */
export async function removeItem(key) {
  if (isDesktop && tauriStore) {
    try {
      await tauriStore.delete(key);
      await tauriStore.save();
    } catch (error) {
      console.error('[Storage] Failed to remove item from Tauri Store:', error);
      throw error;
    }
  } else {
    // Web mode: localStorage
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('[Storage] Failed to remove item from localStorage:', error);
      throw error;
    }
  }
}

/**
 * Clear all storage
 * @returns {Promise<void>}
 */
export async function clear() {
  if (isDesktop && tauriStore) {
    try {
      await tauriStore.clear();
      await tauriStore.save();
    } catch (error) {
      console.error('[Storage] Failed to clear Tauri Store:', error);
      throw error;
    }
  } else {
    // Web mode: localStorage
    try {
      localStorage.clear();
    } catch (error) {
      console.error('[Storage] Failed to clear localStorage:', error);
      throw error;
    }
  }
}

/**
 * Check if running in desktop mode
 * @returns {boolean}
 */
export function isDesktopMode() {
  return isDesktop;
}

/**
 * Get all keys in storage
 * @returns {Promise<string[]>}
 */
export async function keys() {
  if (isDesktop && tauriStore) {
    try {
      return await tauriStore.keys();
    } catch (error) {
      console.error('[Storage] Failed to get keys from Tauri Store:', error);
      return [];
    }
  } else {
    // Web mode: localStorage
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.error('[Storage] Failed to get keys from localStorage:', error);
      return [];
    }
  }
}
