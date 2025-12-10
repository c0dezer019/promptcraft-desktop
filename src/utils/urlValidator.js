/**
 * URL Validation and Sanitization Utilities
 * Prevents XSS attacks via malicious URLs (javascript:, data:, etc.)
 */

/**
 * Validate that a URL is safe for use in img src or similar contexts
 * Only allows http: and https: protocols to prevent XSS attacks
 *
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if the URL is safe, false otherwise
 */
export const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    // Only allow http/https protocols, block javascript:, data:, file:, etc.
    return ['http:', 'https:'].includes(parsed.protocol);
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
