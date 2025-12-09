/**
 * Model definitions and configurations for PromptCraft Desktop
 * LOCAL OVERRIDE: Complete model configuration system
 */

// Cloud Image Models organized by tier
export const CLOUD_IMAGE_MODELS = {
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
                n: [1],
            },
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
                response_format: ['url'],
            },
        },
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
                n: [1],
            },
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
                response_format: ['url'],
            },
        },
        {
            id: 'minimax-image-1.0',
            name: 'Minimax Image 1.0 ',
            provider: 'minimax',
            category: 'image',
            tier: 'highQuality',
            parameters: {
                aspect_ratio: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16']
            }
        },
    ],
    promptOnly: [
        {
            id: 'midjourney',
            name: 'Midjourney',
            provider: 'none',
            category: 'image',
            tier: 'promptOnly',
            parameters: {},
        },
    ],
};

// Local generation tools (not models - these are backends)
export const LOCAL_TOOLS = [
    {
        id: 'comfyui',
        name: 'ComfyUI',
        hasAPI: true,
        defaultPort: 8188,
        defaultUrl: 'http://127.0.0.1:8188',
    },
    {
        id: 'a1111',
        name: 'Automatic1111',
        hasAPI: true,
        defaultPort: 7860,
        defaultUrl: 'http://127.0.0.1:7860',
    },
    {
        id: 'invokeai',
        name: 'InvokeAI',
        hasAPI: true,
        defaultPort: 9090,
        defaultUrl: 'http://127.0.0.1:9090',
    },
];

// Cloud Video Models organized by tier
export const CLOUD_VIDEO_MODELS = {
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
                resolution: ['720p', '1080p'],
            },
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
                resolution: ['720p', '1080p'],
            },
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
                resolution: ['720p', '1080p'],
            },
        },
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
                resolution: ['1080p', '4k'],
            },
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
                resolution: ['720p', '1080p'],
            },
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
                resolution: ['720p', '1080p', '4k'],
            },
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
                resolution: ['1080p', '4k'],
            },
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
                resolution: ['720p', '1080p'],
            },
        },
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
                resolution: ['720p', '1080p'],
            },
        },
    ],
};

// Legacy exports for backward compatibility
export const IMAGE_MODELS = CLOUD_IMAGE_MODELS;
export const VIDEO_MODELS = CLOUD_VIDEO_MODELS;

// Default models per category
export const DEFAULT_MODELS = {
    image: 'gpt-image-1-mini',
    video: 'sora',
};

/**
 * Get all cloud models for a category
 */
export function getAllModels(category) {
    const modelsByCategory =
        category === 'image' ? CLOUD_IMAGE_MODELS : CLOUD_VIDEO_MODELS;
    return Object.values(modelsByCategory).flat();
}

/**
 * Get all cloud models (image + video)
 */
export function getAllCloudModels() {
    return [...getAllModels('image'), ...getAllModels('video')];
}

/**
 * Get model by ID (cloud models only)
 */
export function getModelById(modelId) {
    const allModels = getAllCloudModels();
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
 * Get models by provider (cloud models only)
 */
export function getModelsByProvider(provider, category = null) {
    let allModels = [];

    if (category) {
        allModels = getAllModels(category);
    } else {
        allModels = getAllCloudModels();
    }

    return allModels.filter(m => m.provider === provider);
}

/**
 * Get local tool by ID
 */
export function getLocalToolById(toolId) {
    return LOCAL_TOOLS.find(t => t.id === toolId);
}
