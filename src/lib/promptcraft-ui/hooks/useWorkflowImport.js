import { useState } from 'react';
import {
  parseA1111Text,
  parseA1111PNG,
  parseComfyJSON,
  fetchWorkflowFromURL,
  validateFile
} from '../utils/workflowParser';

/**
 * useWorkflowImport Hook - Manages workflow import state and logic
 * Handles file selection, URL fetching, parsing, and error handling
 * @returns {object} Import state and handlers
 */
export const useWorkflowImport = () => {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [importData, setImportData] = useState(null);
  const [importError, setImportError] = useState(null);
  const [importMode, setImportMode] = useState(null); // 'a1111' | 'comfy'

  /**
   * Handle file selection
   * @param {File} file - Selected file
   * @param {string} mode - 'a1111' | 'comfy'
   */
  const handleFileSelect = async (file, mode) => {
    console.log('🔍 File selected:', { name: file.name, type: file.type, size: file.size, mode });
    setImportError(null);

    // Validate file first
    const validationErrors = validateFile(file, mode);
    if (validationErrors.length > 0) {
      console.error('❌ Validation errors:', validationErrors);
      setImportError(validationErrors.join('. '));
      setImportDialogOpen(true);
      return;
    }

    try {
      let parsed = null;

      if (mode === 'a1111') {
        // Check file type
        if (file.type === 'image/png') {
          console.log('📸 Parsing A1111 PNG...');
          parsed = await parseA1111PNG(file);
        } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          console.log('📝 Parsing A1111 text file...');
          const text = await file.text();
          parsed = parseA1111Text(text);
        } else {
          throw new Error('Unsupported file type. Please use PNG or TXT files for A1111.');
        }
      } else if (mode === 'comfy') {
        if (file.type === 'application/json' || file.name.endsWith('.json')) {
          console.log('🔧 Parsing ComfyUI JSON...');
          const text = await file.text();
          parsed = parseComfyJSON(text);
        } else if (file.type === 'image/png') {
          // ComfyUI can also embed workflows in PNG
          throw new Error('ComfyUI PNG import not yet implemented. Please use JSON files.');
        } else {
          throw new Error('Unsupported file type. Please use JSON files for ComfyUI.');
        }
      }

      console.log('✅ Parsed data:', parsed);
      setImportData(parsed);
      setImportMode(mode);
      setImportDialogOpen(true);
    } catch (error) {
      console.error('❌ Import error:', error);
      setImportError(error.message);
      setImportDialogOpen(true);
    }
  };

  /**
   * Handle URL fetch
   * @param {string} url - URL to fetch
   * @param {string} mode - 'a1111' | 'comfy'
   */
  const handleURLFetch = async (url, mode) => {
    setImportError(null);
    setUrlDialogOpen(false);

    try {
      const { data, type } = await fetchWorkflowFromURL(url);

      let parsed = null;

      if (mode === 'a1111') {
        if (type === 'png') {
          parsed = await parseA1111PNG(data);
        } else if (type === 'text') {
          parsed = parseA1111Text(data);
        } else if (type === 'json') {
          // Try to parse as A1111 JSON (if exists)
          throw new Error('A1111 JSON format not yet implemented. Use PNG or text files.');
        } else {
          throw new Error('URL must point to a PNG image or text file for A1111.');
        }
      } else if (mode === 'comfy') {
        if (type === 'json') {
          parsed = parseComfyJSON(data);
        } else {
          throw new Error('URL must point to a JSON file for ComfyUI.');
        }
      }

      setImportData(parsed);
      setImportMode(mode);
      setImportDialogOpen(true);
    } catch (error) {
      setImportError(error.message);
      setImportDialogOpen(true);
    }
  };

  /**
   * Reset import state
   */
  const resetImport = () => {
    setImportDialogOpen(false);
    setUrlDialogOpen(false);
    setImportData(null);
    setImportError(null);
    setImportMode(null);
  };

  return {
    importDialogOpen,
    urlDialogOpen,
    importData,
    importError,
    importMode,
    handleFileSelect,
    handleURLFetch,
    setUrlDialogOpen,
    resetImport
  };
};
