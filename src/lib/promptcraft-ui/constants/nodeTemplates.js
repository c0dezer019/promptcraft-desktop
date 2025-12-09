export const NODE_TEMPLATES = {
  KSampler: {
    type: 'core',
    title: 'KSampler',
    fields: {
      seed: { type: 'number', value: -1, label: 'Seed' },
      steps: { type: 'number', value: 20, label: 'Steps' },
      cfg: { type: 'number', value: 7.0, label: 'CFG' },
      sampler_name: {
        type: 'select',
        value: 'euler',
        label: 'Sampler',
        options: [
          'euler', 'euler_ancestral', 'heun', 'heunpp2', 'dpm_2', 'dpm_2_ancestral',
          'lms', 'dpm_fast', 'dpm_adaptive', 'dpmpp_2s_ancestral', 'dpmpp_sde', 'dpmpp_sde_gpu',
          'dpmpp_2m', 'dpmpp_2m_sde', 'dpmpp_2m_sde_gpu', 'dpmpp_3m_sde', 'dpmpp_3m_sde_gpu',
          'ddpm', 'lcm', 'ddim', 'uni_pc', 'uni_pc_bh2'
        ]
      },
      scheduler: {
        type: 'select',
        value: 'normal',
        label: 'Scheduler',
        options: ['normal', 'karras', 'exponential', 'sgm_uniform', 'simple', 'ddim_uniform']
      },
      denoise: { type: 'number', value: 1.0, label: 'Denoise' }
    }
  },
  CheckpointLoaderSimple: {
    type: 'core',
    title: 'Load Checkpoint',
    fields: {
      ckpt_name: { type: 'text', value: 'v1-5-pruned-emaonly.ckpt', label: 'Checkpoint Name' }
    }
  },
  EmptyLatentImage: {
    type: 'core',
    title: 'Empty Latent Image',
    fields: {
      width: { type: 'number', value: 512, label: 'Width' },
      height: { type: 'number', value: 512, label: 'Height' },
      batch_size: { type: 'number', value: 1, label: 'Batch Size' }
    }
  },
  CLIPTextEncode: {
    type: 'core',
    title: 'CLIP Text Encode',
    fields: {
      text: { type: 'textarea', value: '', label: 'Prompt Text' }
    }
  },
  SaveImage: {
    type: 'core',
    title: 'Save Image',
    fields: {
      filename_prefix: { type: 'text', value: 'ComfyUI', label: 'Filename Prefix' }
    }
  },
  Custom: {
    type: 'custom',
    title: 'Custom Node',
    fields: {} // Dynamic fields
  }
};
