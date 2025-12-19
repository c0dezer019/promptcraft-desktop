/**
 * URL Validation and Sanitization Utilities
 * Prevents XSS attacks via malicious URLs (javascript:, data:, etc.)
 */

/**
 * Validate that a URL is safe for use in img src or similar contexts
 * Allows http:, https:, asset:, and file: protocols
 * Blocks javascript:, data: (for non-base64), and other dangerous protocols
 *
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if the URL is safe, false otherwise
 */
export const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Allow data: URLs for base64 images (common pattern for inline images)
  if (url.startsWith('data:image/')) {
    return true;
  }

  try {
    const parsed = new URL(url);
    // Allow http/https (remote), asset: (Tauri), and file: (local files)
    // Block javascript:, vbscript:, and other dangerous protocols
    return ['http:', 'https:', 'asset:', 'file:'].includes(parsed.protocol);
  } catch {
    // Invalid URL
    return false;
  }
};

/**
 * Sanitize a URL for safe use, returning null if invalid
 *
 * @param {string} url - The URL to sanitize
 * @returns {string|null} - The URL if valid, null otherwise
 */
export const sanitizeUrl = (url) => {
  return isValidImageUrl(url) ? url : null;
};

/**
 * Validate a video URL (same as image URL for now)
 *
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if the URL is safe, false otherwise
 */
export const isValidVideoUrl = (url) => {
  return isValidImageUrl(url);
};
