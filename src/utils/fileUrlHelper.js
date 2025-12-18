import { convertFileSrc } from '@tauri-apps/api/core';

/**
 * Convert a file:// URL to a Tauri asset protocol URL
 * @param {string} url - The URL to convert (can be file://, http://, https://, or data: URL)
 * @returns {string} - Converted URL safe for use in Tauri
 */
export function convertToAssetUrl(url) {
  if (!url) return null;

  // If it's a file:// URL, convert to Tauri asset protocol
  if (url.startsWith('file://')) {
    const filePath = url.replace('file://', '');
    try {
      // In Tauri v2, convertFileSrc uses 'https://asset.localhost' by default
      const assetUrl = convertFileSrc(filePath);
      console.log('[fileUrlHelper] Converted:', filePath, '->', assetUrl);
      return assetUrl;
    } catch (error) {
      console.error('[fileUrlHelper] Failed to convert file URL:', error);
      // Fallback to the raw file path if conversion fails
      return url;
    }
  }

  // For http://, https://, data: URLs, return as-is
  return url;
}
