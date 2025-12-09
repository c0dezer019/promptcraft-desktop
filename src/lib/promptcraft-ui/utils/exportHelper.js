/**
 * Export prompt data to markdown file
 * @param {string} activeTool - Current tool ID
 * @param {object} promptData - Prompt data for the tool
 * @param {string} finalPromptText - Combined final prompt text
 */
export const exportPromptToMarkdown = (activeTool, promptData, finalPromptText) => {
  let content = `# PromptCraft Export - ${activeTool.toUpperCase()}\n`;
  content += `Date: ${new Date().toLocaleString()}\n\n`;

  content += `## Main Prompt\n${finalPromptText}\n\n`;

  if (promptData.negative) {
    content += `## Negative Prompt\n${promptData.negative}\n\n`;
  }

  if (activeTool === 'a1111' && promptData.params) {
    content += `## Generation Parameters\n`;
    Object.entries(promptData.params).forEach(([key, value]) => {
      content += `- **${key}**: ${value}\n`;
    });
  }

  if (activeTool === 'comfy' && promptData.nodes) {
    content += `## ComfyUI Node Graph\n`;
    promptData.nodes.forEach((n, i) => {
      content += `\n### [${i + 1}] ${n.title} (${n.type})\n`;
      Object.entries(n.fields).forEach(([key, field]) => {
        content += `- **${field.label || key}**: ${field.value}\n`;
      });
    });
  }

  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `promptcraft_${activeTool}_${Date.now()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    console.error("Clipboard not available", e);
    return false;
  }
};

/**
 * Export ComfyUI workflow to JSON file
 * @param {object} promptData - Prompt data for ComfyUI
 */
export const exportComfyWorkflow = (promptData) => {
  const workflow = {
    id: crypto.randomUUID(),
    revision: 0,
    last_node_id: promptData.nodes?.length || 0,
    last_link_id: 0,
    nodes: [],
    links: [],
    groups: [],
    config: {},
    extra: {
      ds: {
        scale: 1,
        offset: [0, 0]
      }
    },
    version: 0.4
  };

  let nodeId = 1;
  let yPos = 100;

  // Add CLIPTextEncode nodes for prompts
  if (promptData.main) {
    workflow.nodes.push({
      id: nodeId++,
      type: 'CLIPTextEncode',
      pos: [100, yPos],
      size: [400, 200],
      flags: {},
      order: 0,
      mode: 0,
      inputs: [
        { localized_name: 'clip', name: 'clip', type: 'CLIP', link: null }
      ],
      outputs: [
        { localized_name: 'CONDITIONING', name: 'CONDITIONING', type: 'CONDITIONING', links: [] }
      ],
      title: 'Positive Prompt',
      properties: { 'Node name for S&R': 'CLIPTextEncode' },
      widgets_values: [promptData.main]
    });
    yPos += 250;
  }

  if (promptData.negative) {
    workflow.nodes.push({
      id: nodeId++,
      type: 'CLIPTextEncode',
      pos: [100, yPos],
      size: [400, 200],
      flags: {},
      order: 1,
      mode: 0,
      inputs: [
        { localized_name: 'clip', name: 'clip', type: 'CLIP', link: null }
      ],
      outputs: [
        { localized_name: 'CONDITIONING', name: 'CONDITIONING', type: 'CONDITIONING', links: [] }
      ],
      title: 'Negative Prompt',
      properties: { 'Node name for S&R': 'CLIPTextEncode' },
      widgets_values: [promptData.negative]
    });
    yPos += 250;
  }

  // Add other nodes from the workflow
  if (promptData.nodes) {
    promptData.nodes.forEach(node => {
      const widgetValues = [];
      const nodeInputs = [];
      const nodeOutputs = [];

      // Convert our simplified node format to ComfyUI format
      if (node.templateKey === 'KSampler') {
        widgetValues.push(
          node.fields.seed?.value ?? -1,
          'randomize',
          node.fields.steps?.value ?? 20,
          node.fields.cfg?.value ?? 7.0,
          node.fields.sampler_name?.value ?? 'euler',
          node.fields.scheduler?.value ?? 'normal',
          node.fields.denoise?.value ?? 1.0
        );
        nodeInputs.push(
          { name: 'model', type: 'MODEL', link: null },
          { name: 'positive', type: 'CONDITIONING', link: null },
          { name: 'negative', type: 'CONDITIONING', link: null },
          { name: 'latent_image', type: 'LATENT', link: null }
        );
        nodeOutputs.push({ name: 'LATENT', type: 'LATENT', links: [] });
      } else if (node.templateKey === 'CheckpointLoaderSimple') {
        widgetValues.push(node.fields.ckpt_name?.value ?? 'model.ckpt');
        nodeOutputs.push(
          { name: 'MODEL', type: 'MODEL', links: [] },
          { name: 'CLIP', type: 'CLIP', links: [] },
          { name: 'VAE', type: 'VAE', links: [] }
        );
      } else if (node.templateKey === 'EmptyLatentImage') {
        widgetValues.push(
          node.fields.width?.value ?? 512,
          node.fields.height?.value ?? 512,
          node.fields.batch_size?.value ?? 1
        );
        nodeOutputs.push({ name: 'LATENT', type: 'LATENT', links: [] });
      } else if (node.templateKey === 'SaveImage') {
        widgetValues.push(node.fields.filename_prefix?.value ?? 'ComfyUI');
        nodeInputs.push({ name: 'images', type: 'IMAGE', link: null });
      } else if (node.title === 'LoRA Loader') {
        widgetValues.push(
          node.fields.lora_name?.value ?? 'lora.safetensors',
          node.fields.strength_model?.value ?? 1.0,
          node.fields.strength_clip?.value ?? 1.0
        );
        nodeInputs.push(
          { name: 'model', type: 'MODEL', link: null },
          { name: 'clip', type: 'CLIP', link: null }
        );
        nodeOutputs.push(
          { name: 'MODEL', type: 'MODEL', links: [] },
          { name: 'CLIP', type: 'CLIP', links: [] }
        );
      } else {
        // Custom node - extract all fields
        Object.entries(node.fields).forEach(([key, field]) => {
          widgetValues.push(field.value);
        });
      }

      workflow.nodes.push({
        id: nodeId++,
        type: node.templateKey === 'Custom' ? node.title : node.templateKey,
        pos: [600, yPos],
        size: [300, 200],
        flags: {},
        order: nodeId - 1,
        mode: 0,
        inputs: nodeInputs,
        outputs: nodeOutputs,
        title: node.title,
        properties: { 'Node name for S&R': node.templateKey },
        widgets_values: widgetValues
      });
      yPos += 250;
    });
  }

  // Create blob and download
  const jsonStr = JSON.stringify(workflow, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `comfyui_workflow_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Export A1111 parameters to text file (inverse of import)
 * @param {object} promptData - Prompt data for A1111
 */
export const exportA1111Text = (promptData) => {
  // Format: same as what we import
  // Line 1: Positive prompt
  // Line 2: Negative prompt: [text]
  // Line 3: Steps: X, Sampler: Y, CFG scale: Z, Seed: A, Size: WxH, Batch size: B

  let text = '';

  // Positive prompt
  text += promptData.main || '';
  text += '\n';

  // Negative prompt
  if (promptData.negative) {
    text += `Negative prompt: ${promptData.negative}`;
    text += '\n';
  }

  // Parameters
  if (promptData.params) {
    const params = promptData.params;
    const paramsParts = [];

    if (params.steps !== undefined) paramsParts.push(`Steps: ${params.steps}`);
    if (params.sampler) paramsParts.push(`Sampler: ${params.sampler}`);
    if (params.cfg !== undefined) paramsParts.push(`CFG scale: ${params.cfg}`);
    if (params.seed !== undefined) paramsParts.push(`Seed: ${params.seed}`);
    if (params.width !== undefined && params.height !== undefined) {
      paramsParts.push(`Size: ${params.width}x${params.height}`);
    }
    if (params.batch_size !== undefined && params.batch_size !== 1) {
      paramsParts.push(`Batch size: ${params.batch_size}`);
    }

    text += paramsParts.join(', ');
  }

  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `a1111_params_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
