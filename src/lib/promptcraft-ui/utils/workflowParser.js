/**
 * Workflow Parser Utility
 * Parses A1111 and ComfyUI workflow files into our application's data structure
 */

import { A1111_SAMPLERS } from '../constants/samplers';
import { NODE_TEMPLATES } from '../constants/nodeTemplates';
import { extractPNGMetadata } from './pngMetadata';

/**
 * Parse A1111 text format
 * Format:
 * positive prompt text
 * Negative prompt: negative text
 * Steps: 20, Sampler: DPM++ 2M Karras, CFG scale: 7, Seed: 12345, Size: 512x512
 *
 * @param {string} text - A1111 parameters text
 * @returns {object} Parsed workflow data
 */
export function parseA1111Text(text) {
  const lines = text.trim().split('\n');

  const result = {
    prompt: '',
    negativePrompt: '',
    params: {
      sampler: 'DPM++ 2M Karras',
      steps: 20,
      width: 512,
      height: 512,
      cfg: 7.0,
      seed: -1,
      batch_size: 1
    }
  };

  // Find where the negative prompt or params line starts
  let paramsLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().startsWith('negative prompt:') ||
        lines[i].match(/Steps:|Sampler:|CFG scale:/i)) {
      paramsLineIndex = i;
      break;
    }
  }

  // Extract positive prompt (everything before negative/params line)
  if (paramsLineIndex > 0) {
    result.prompt = lines.slice(0, paramsLineIndex).join('\n').trim();
  } else if (paramsLineIndex === -1) {
    // No params found, entire text is the prompt
    result.prompt = lines.join('\n').trim();
  }

  // Extract negative prompt
  for (const line of lines) {
    const negMatch = line.match(/^Negative prompt:\s*(.+)/i);
    if (negMatch) {
      result.negativePrompt = negMatch[1].trim();
      break;
    }
  }

  // Extract parameters
  const paramsLine = lines.find(line =>
    line.match(/Steps:|Sampler:|CFG scale:/i)
  );

  if (paramsLine) {
    // Steps
    const stepsMatch = paramsLine.match(/Steps:\s*(\d+)/i);
    if (stepsMatch) result.params.steps = parseInt(stepsMatch[1]);

    // Sampler
    const samplerMatch = paramsLine.match(/Sampler:\s*([^,]+)/i);
    if (samplerMatch) {
      const samplerName = samplerMatch[1].trim();
      // Validate against known samplers
      if (A1111_SAMPLERS.includes(samplerName)) {
        result.params.sampler = samplerName;
      }
    }

    // CFG Scale
    const cfgMatch = paramsLine.match(/CFG scale:\s*([\d.]+)/i);
    if (cfgMatch) result.params.cfg = parseFloat(cfgMatch[1]);

    // Seed
    const seedMatch = paramsLine.match(/Seed:\s*(-?\d+)/i);
    if (seedMatch) result.params.seed = parseInt(seedMatch[1]);

    // Size (Width x Height)
    const sizeMatch = paramsLine.match(/Size:\s*(\d+)x(\d+)/i);
    if (sizeMatch) {
      result.params.width = parseInt(sizeMatch[1]);
      result.params.height = parseInt(sizeMatch[2]);
    }

    // Batch size
    const batchMatch = paramsLine.match(/Batch size:\s*(\d+)/i);
    if (batchMatch) result.params.batch_size = parseInt(batchMatch[1]);
  }

  return validateA1111Data(result);
}

/**
 * Parse A1111 PNG file
 * @param {File} file - PNG file object
 * @returns {Promise<object>} Parsed workflow data
 */
export async function parseA1111PNG(file) {
  const metadata = await extractPNGMetadata(file);
  return parseA1111Text(metadata);
}

/**
 * Parse ComfyUI workflow JSON
 * Maps ComfyUI nodes to our simplified node structure
 * @param {string|object} jsonData - ComfyUI workflow JSON
 * @returns {object} Parsed workflow data
 */
export function parseComfyJSON(jsonData) {
  const result = {
    prompt: '',
    negativePrompt: '',
    nodes: []
  };

  // Parse JSON if string
  const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
  console.log('📋 Raw ComfyUI JSON structure:', data);
  console.log('📋 JSON keys:', Object.keys(data));

  let nodesArray = [];

  // ComfyUI workflows can have different formats
  // Format 1: Web UI export - { "nodes": [...] } - array format with "type" field
  // Format 2: API format - { "1": {...}, "2": {...} } - object with "class_type" field

  if (data.nodes && Array.isArray(data.nodes)) {
    console.log('📋 Detected Web UI export format (nodes array)');
    nodesArray = data.nodes;
  } else if (data.workflow && data.workflow.nodes) {
    console.log('📋 Detected workflow wrapper format');
    nodesArray = data.workflow.nodes;
  } else {
    // API format - convert object to array
    console.log('📋 Detected API format (object with class_type)');
    nodesArray = Object.values(data);
  }

  console.log(`📋 Processing ${nodesArray.length} nodes`);

  // Extract nodes
  nodesArray.forEach((nodeData, index) => {
    console.log(`Processing node ${index}:`, nodeData);

    // Get the node type - different formats use different field names
    const classType = nodeData.type || nodeData.class_type;
    if (!classType) {
      console.log(`Skipping node ${index} - no type/class_type found`);
      return;
    }

    console.log(`Node type: ${classType}`);

    // Handle CLIP Text Encode (prompts)
    if (classType === 'CLIPTextEncode') {
      // In Web UI format, text is in widgets_values[0]
      // In API format, text is in inputs.text
      const text = nodeData.widgets_values?.[0] || nodeData.inputs?.text || '';

      // Check title/name to determine if it's negative
      const title = (nodeData.title || '').toLowerCase();
      const isNegative = title.includes('negative') || title.includes('neg');

      console.log(`CLIPTextEncode - Title: "${nodeData.title}", Text: "${text.substring(0, 50)}...", isNegative: ${isNegative}`);

      if (isNegative) {
        result.negativePrompt = text;
      } else {
        // Concatenate multiple positive prompts
        result.prompt = result.prompt ? `${result.prompt}, ${text}` : text;
      }

      // Skip creating a visual node for CLIPTextEncode - we've extracted the prompts
      return;
    }

    // Skip utility nodes that don't have meaningful data for our simplified UI
    if (classType === 'VAEDecode' || classType === 'VAEEncode' ||
        classType === 'ConditioningConcat' || classType === 'VAELoader') {
      console.log(`Skipping utility node: ${classType}`);
      return;
    }

    // Map to our node templates
    let mappedNode = null;

    if (classType === 'KSampler') {
      // Web UI format: widgets_values = [seed, "randomize"/"fixed", steps, cfg, sampler_name, scheduler, denoise]
      // API format: inputs object
      const widgetVals = nodeData.widgets_values || [];
      mappedNode = {
        id: Date.now() + Math.random(),
        templateKey: 'KSampler',
        title: 'KSampler',
        type: 'core',
        fields: {
          seed: { type: 'number', value: widgetVals[0] ?? nodeData.inputs?.seed ?? -1, label: 'Seed' },
          steps: { type: 'number', value: widgetVals[2] ?? nodeData.inputs?.steps ?? 20, label: 'Steps' },
          cfg: { type: 'number', value: widgetVals[3] ?? nodeData.inputs?.cfg ?? 7.0, label: 'CFG' },
          sampler_name: {
            type: 'select',
            value: widgetVals[4] ?? nodeData.inputs?.sampler_name ?? 'euler',
            label: 'Sampler',
            options: NODE_TEMPLATES.KSampler.fields.sampler_name.options
          },
          scheduler: {
            type: 'select',
            value: widgetVals[5] ?? nodeData.inputs?.scheduler ?? 'normal',
            label: 'Scheduler',
            options: NODE_TEMPLATES.KSampler.fields.scheduler.options
          },
          denoise: { type: 'number', value: widgetVals[6] ?? nodeData.inputs?.denoise ?? 1.0, label: 'Denoise' }
        }
      };
    } else if (classType === 'CheckpointLoaderSimple') {
      const widgetVals = nodeData.widgets_values || [];
      mappedNode = {
        id: Date.now() + Math.random(),
        templateKey: 'CheckpointLoaderSimple',
        title: 'Load Checkpoint',
        type: 'core',
        fields: {
          ckpt_name: {
            type: 'text',
            value: widgetVals[0] ?? nodeData.inputs?.ckpt_name ?? 'model.ckpt',
            label: 'Checkpoint Name'
          }
        }
      };
    } else if (classType === 'EmptyLatentImage') {
      const widgetVals = nodeData.widgets_values || [];
      mappedNode = {
        id: Date.now() + Math.random(),
        templateKey: 'EmptyLatentImage',
        title: 'Empty Latent Image',
        type: 'core',
        fields: {
          width: { type: 'number', value: widgetVals[0] ?? nodeData.inputs?.width ?? 512, label: 'Width' },
          height: { type: 'number', value: widgetVals[1] ?? nodeData.inputs?.height ?? 512, label: 'Height' },
          batch_size: { type: 'number', value: widgetVals[2] ?? nodeData.inputs?.batch_size ?? 1, label: 'Batch Size' }
        }
      };
    } else if (classType === 'SaveImage') {
      const widgetVals = nodeData.widgets_values || [];
      mappedNode = {
        id: Date.now() + Math.random(),
        templateKey: 'SaveImage',
        title: 'Save Image',
        type: 'core',
        fields: {
          filename_prefix: {
            type: 'text',
            value: widgetVals[0] ?? nodeData.inputs?.filename_prefix ?? 'ComfyUI',
            label: 'Filename Prefix'
          }
        }
      };
    } else if (classType === 'LoraLoader') {
      const widgetVals = nodeData.widgets_values || [];
      mappedNode = {
        id: Date.now() + Math.random(),
        templateKey: 'Custom',
        title: 'LoRA Loader',
        type: 'custom',
        fields: {
          lora_name: {
            type: 'text',
            value: widgetVals[0] ?? 'lora.safetensors',
            label: 'LoRA Name'
          },
          strength_model: {
            type: 'number',
            value: widgetVals[1] ?? 1.0,
            label: 'Model Strength'
          },
          strength_clip: {
            type: 'number',
            value: widgetVals[2] ?? 1.0,
            label: 'CLIP Strength'
          }
        }
      };
    } else {
      // Create custom node for unknown types
      const fields = {};
      if (nodeData.inputs) {
        Object.entries(nodeData.inputs).forEach(([key, value]) => {
          // Skip non-primitive values (arrays, objects that aren't simple data)
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) return;

          fields[key] = {
            type: typeof value === 'number' ? 'number' : 'text',
            value: value,
            label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
          };
        });
      }

      mappedNode = {
        id: Date.now() + Math.random(),
        templateKey: 'Custom',
        title: classType,
        type: 'custom',
        fields
      };
    }

    if (mappedNode) {
      result.nodes.push(mappedNode);
    }
  });

  return validateComfyData(result);
}

/**
 * Fetch workflow from URL
 * @param {string} url - URL to fetch
 * @returns {Promise<{data: any, type: string}>}
 */
export async function fetchWorkflowFromURL(url) {
  try {
    const response = await fetch(url, {
      mode: 'cors',
      headers: {
        'Accept': 'application/json, image/png, text/plain'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      return { data, type: 'json' };
    } else if (contentType.includes('image/png')) {
      const blob = await response.blob();
      const file = new File([blob], 'workflow.png', { type: 'image/png' });
      return { data: file, type: 'png' };
    } else {
      const text = await response.text();
      return { data: text, type: 'text' };
    }
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('CORS error: The server does not allow cross-origin requests. Try downloading the file and importing it directly.');
    }
    throw error;
  }
}

/**
 * Validate and normalize A1111 data
 * @param {object} data - Parsed A1111 data
 * @returns {object} Validated data
 */
export function validateA1111Data(data) {
  const warnings = [];

  // Check if sampler is valid
  if (data.params?.sampler && !A1111_SAMPLERS.includes(data.params.sampler)) {
    warnings.push(`Unknown sampler "${data.params.sampler}", using default`);
    data.params.sampler = 'DPM++ 2M Karras';
  }

  // Validate dimensions
  if (data.params?.width && (data.params.width < 64 || data.params.width > 2048)) {
    warnings.push('Width out of range (64-2048), using 512');
    data.params.width = 512;
  }

  if (data.params?.height && (data.params.height < 64 || data.params.height > 2048)) {
    warnings.push('Height out of range (64-2048), using 512');
    data.params.height = 512;
  }

  // Validate steps
  if (data.params?.steps && (data.params.steps < 1 || data.params.steps > 150)) {
    warnings.push('Steps out of range (1-150), using 20');
    data.params.steps = 20;
  }

  // Validate CFG
  if (data.params?.cfg && (data.params.cfg < 0 || data.params.cfg > 30)) {
    warnings.push('CFG scale out of range (0-30), using 7');
    data.params.cfg = 7.0;
  }

  if (warnings.length > 0) {
    console.warn('A1111 import warnings:', warnings);
  }

  return data;
}

/**
 * Validate and normalize ComfyUI data
 * @param {object} data - Parsed ComfyUI data
 * @returns {object} Validated data
 */
export function validateComfyData(data) {
  const warnings = [];

  // Ensure nodes array exists
  if (!Array.isArray(data.nodes)) {
    warnings.push('No valid nodes found in workflow');
    data.nodes = [];
  }

  // Validate node structure
  data.nodes = data.nodes.filter(node => {
    if (!node.templateKey || !node.fields) {
      warnings.push(`Skipping invalid node: ${node.title || 'Unknown'}`);
      return false;
    }
    return true;
  });

  if (warnings.length > 0) {
    console.warn('ComfyUI import warnings:', warnings);
  }

  return data;
}

/**
 * Validate file before parsing
 * @param {File} file - File to validate
 * @param {string} expectedType - 'a1111' | 'comfy'
 * @returns {string[]} Array of error messages (empty if valid)
 */
export function validateFile(file, expectedType) {
  const errors = [];

  // File size limit (10MB)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    errors.push('File size exceeds 10MB limit');
  }

  // File type validation
  const validTypes = {
    'a1111': ['image/png', 'text/plain'],
    'comfy': ['application/json']
  };

  if (expectedType && validTypes[expectedType]) {
    const isValid = validTypes[expectedType].includes(file.type) ||
      (expectedType === 'a1111' && file.name.endsWith('.txt')) ||
      (expectedType === 'comfy' && file.name.endsWith('.json'));

    if (!isValid) {
      errors.push(`Invalid file type. Expected: ${validTypes[expectedType].join(', ')}`);
    }
  }

  return errors;
}
