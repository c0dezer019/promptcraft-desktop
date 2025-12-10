import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { isValidImageUrl } from './urlValidator';

/**
 * Download image from URL
 * Uses Tauri filesystem APIs in desktop mode, falls back to browser download in web mode
 *
 * @param {string} url - Image URL to download
 * @param {string} filename - Suggested filename
 * @param {boolean} isDesktop - Whether running in Tauri desktop mode
 */
export async function downloadImage(url, filename = 'image.png', isDesktop = false) {
  try {
    // Validate URL to prevent SSRF and other attacks
    if (!isValidImageUrl(url)) {
      throw new Error('Invalid or unsafe URL provided for download');
    }

    if (isDesktop) {
      // Tauri desktop mode - use filesystem APIs
      console.log('[downloadHelper] Downloading via Tauri:', url);

      // Fetch the image data
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Show save dialog
      const filePath = await save({
        defaultPath: filename,
        filters: [
          {
            name: 'Image',
            extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif']
          }
        ]
      });

      if (!filePath) {
        console.log('[downloadHelper] Download cancelled by user');
        return false;
      }

      // Write file
      await writeFile(filePath, uint8Array);
      console.log('[downloadHelper] File saved to:', filePath);
      return true;
    } else {
      // Web mode - use browser download
      console.log('[downloadHelper] Downloading via browser:', url);

      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      URL.revokeObjectURL(blobUrl);
      return true;
    }
  } catch (error) {
    console.error('[downloadHelper] Download failed:', error);
    throw error;
  }
}

/**
 * Generate filename from job metadata
 *
 * @param {Object} job - Job object
 * @returns {string} Suggested filename
 */
export function getJobFilename(job) {
  const timestamp = new Date(job.created_at).getTime();
  const provider = job.data?.provider || 'unknown';
  const model = job.data?.model || 'unknown';

  // Extract file extension from URL if available
  let extension = 'png';
  if (job.result?.output_url) {
    const urlParts = job.result.output_url.split('.');
    const lastPart = urlParts[urlParts.length - 1].split('?')[0];
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(lastPart.toLowerCase())) {
      extension = lastPart.toLowerCase();
    }
  }

  return `${provider}_${model}_${timestamp}.${extension}`;
}

/**
 * Download job result
 *
 * @param {Object} job - Job object with result
 * @param {boolean} isDesktop - Whether running in Tauri desktop mode
 */
export async function downloadJobResult(job, isDesktop = false) {
  if (!job.result?.output_url) {
    throw new Error('No output URL available for download');
  }

  const filename = getJobFilename(job);
  return downloadImage(job.result.output_url, filename, isDesktop);
}
