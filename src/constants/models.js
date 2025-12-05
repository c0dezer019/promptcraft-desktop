/**
 * Model definitions and configurations for PromptCraft Desktop
 * LOCAL OVERRIDE: Complete model configuration system
 */

// Image Models organized by tier
export const IMAGE_MODELS = {
  standard: [
    {
      id: 'gpt-image-1-mini',
      name: 'GPT Image Mini',
      provider: 'openai',
      category: 'image',
      tier: 'standard',
      parameters: {
        size: ['1024x1024', '1024x1792', '1792x1024'],
        quality: ['standard'],
        style: ['vivid', 'natural'],
        n: [1]
      }
    },
    {
      id: 'grok-2-image',
      name: 'Grok Aurora',
      provider: 'grok',
      category: 'image',
      tier: 'standard',
      parameters: {
        tone: ['Standard', 'Fun Mode', 'Technical'],
        n: [1],
        response_format: ['url']
      }
    }
  ],
  highQuality: [
    {
      id: 'gpt-image-1',
      name: 'GPT Image HQ',
      provider: 'openai',
      category: 'image',
      tier: 'highQuality',
      parameters: {
        size: ['1024x1024', '1024x1792', '1792x1024'],
        quality: ['standard', 'hd'],
        style: ['vivid', 'natural'],
        n: [1]
      }
    },
    {
      id: 'aurora',
      name: 'Grok Aurora Pro',
      provider: 'grok',
      category: 'image',
      tier: 'highQuality',
      parameters: {
        tone: ['Standard', 'Fun Mode', 'Technical'],
        n: [1],
        response_format: ['url']
      }
    }
  ],
  local: [
    {
      id: 'comfy',
      name: 'ComfyUI',
      provider: 'local',
      category: 'image',
      tier: 'local',
      parameters: {}
    },
    {
      id: 'a1111',
      name: 'Automatic1111',
      provider: 'local',
      category: 'image',
      tier: 'local',
      parameters: {
        steps: 20,
        cfg_scale: 7,
        width: 512,
        height: 512,
        sampler: 'Euler a'
      }
    }
  ],
  promptOnly: [
    {
      id: 'midjourney',
      name: 'Midjourney',
      provider: 'none',
      category: 'image',
      tier: 'promptOnly',
      parameters: {}
    }
  ]
};

// Video Models organized by tier
export const VIDEO_MODELS = {
  standard: [
    {
      id: 'sora',
      name: 'Sora',
      provider: 'openai',
      category: 'video',
      tier: 'standard',
      parameters: {
        duration: [5],
        aspect_ratio: ['16:9', '9:16', '1:1'],
        resolution: ['720p', '1080p']
      }
    },
    {
      id: 'runway-gen3-alpha-turbo',
      name: 'Runway Gen-3 Alpha Turbo',
      provider: 'runway',
      category: 'video',
      tier: 'standard',
      parameters: {
        duration: [5, 10],
        aspect_ratio: ['16:9', '9:16', '1:1'],
        resolution: ['720p', '1080p']
      }
    },
    {
      id: 'luma-dream-machine',
      name: 'Luma Dream Machine',
      provider: 'luma',
      category: 'video',
      tier: 'standard',
      parameters: {
        duration: [5],
        aspect_ratio: ['16:9', '9:16', '1:1', '4:3', '3:4'],
        resolution: ['720p', '1080p']
      }
    }
  ],
  highQuality: [
    {
      id: 'sora-2-pro',
      name: 'Sora 2 Pro',
      provider: 'openai',
      category: 'video',
      tier: 'highQuality',
      parameters: {
        duration: [5, 10, 15, 20],
        aspect_ratio: ['16:9', '9:16', '1:1', '2.35:1', '21:9'],
        resolution: ['1080p', '4k']
      }
    },
    {
      id: 'veo-3.1-generate-preview',
      name: 'Google Veo 3.1',
      provider: 'google',
      category: 'video',
      tier: 'highQuality',
      parameters: {
        duration: [5, 10],
        aspect_ratio: ['16:9', '9:16', '1:1'],
        resolution: ['720p', '1080p']
      }
    },
    {
      id: 'runway-gen3-alpha',
      name: 'Runway Gen-3 Alpha',
      provider: 'runway',
      category: 'video',
      tier: 'highQuality',
      parameters: {
        duration: [5, 10],
        aspect_ratio: ['16:9', '9:16', '1:1'],
        resolution: ['720p', '1080p', '4k']
      }
    },
    {
      id: 'luma-ray',
      name: 'Luma Ray',
      provider: 'luma',
      category: 'video',
      tier: 'highQuality',
      parameters: {
        duration: [5, 10],
        aspect_ratio: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
        resolution: ['1080p', '4k']
      }
    },
    {
      id: 'hailuo-minimax',
      name: 'Hailuo MiniMax',
      provider: 'hailuo',
      category: 'video',
      tier: 'highQuality',
      parameters: {
        duration: [5, 10],
        aspect_ratio: ['16:9', '9:16', '1:1'],
        resolution: ['720p', '1080p']
      }
    }
  ],
  legacy: [
    {
      id: 'veo',
      name: 'Google Veo (Legacy)',
      provider: 'google',
      category: 'video',
      tier: 'legacy',
      parameters: {
        duration: [5],
        aspect_ratio: ['16:9', '9:16', '1:1'],
        resolution: ['720p', '1080p']
      }
    }
  ]
};

// Default models per category
export const DEFAULT_MODELS = {
  image: 'gpt-image-1-mini',
  video: 'sora'
};

/**
 * Get all models for a category
 */
export function getAllModels(category) {
  const modelsByCategory = category === 'image' ? IMAGE_MODELS : VIDEO_MODELS;
  return Object.values(modelsByCategory).flat();
}

/**
 * Get model by ID
 */
export function getModelById(modelId) {
  const allModels = [...getAllModels('image'), ...getAllModels('video')];
  return allModels.find(m => m.id === modelId);
}

/**
 * Get provider for a model ID
 */
export function getModelProvider(modelId) {
  const model = getModelById(modelId);
  return model?.provider || 'none';
}

/**
 * Get tier for a model ID
 */
export function getModelTier(modelId) {
  const model = getModelById(modelId);
  return model?.tier || 'standard';
}

/**
 * Get models by provider
 */
export function getModelsByProvider(provider, category = null) {
  let allModels = [];

  if (category) {
    allModels = getAllModels(category);
  } else {
    allModels = [...getAllModels('image'), ...getAllModels('video')];
  }

  return allModels.filter(m => m.provider === provider);
}
