import { Video, MonitorPlay, Terminal, Box, Aperture, Image, ImageIcon } from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'sora', label: 'Sora', icon: Video, color: 'text-black dark:text-white' },
  { id: 'veo', label: 'Veo', icon: MonitorPlay, color: 'text-blue-500' },
  { id: 'grok', label: 'Grok', icon: Terminal, color: 'text-gray-500 dark:text-gray-300' },
  { id: 'dalle', label: 'DALL-E', icon: ImageIcon, color: 'text-green-500' },
  { id: 'midjourney', label: 'Midjourney', icon: Image, color: 'text-pink-500' },
  { id: 'comfy', label: 'ComfyUI', icon: Box, color: 'text-purple-500' },
  { id: 'a1111', label: 'A1111', icon: Aperture, color: 'text-orange-500' },
];

export const TOOL_DESCRIPTIONS = {
  sora: "Create photorealistic videos with physics simulation descriptions.",
  veo: "Generate 1080p+ videos with cinematic control.",
  grok: "Interact with the witty Grok AI or generate Flux images.",
  dalle: "Generate images with OpenAI's DALL-E 3 - vivid, natural, HD quality.",
  midjourney: "Craft detailed Midjourney prompts with parameters like --ar, --style, and --quality.",
  comfy: "Node-based Stable Diffusion workflow prompting.",
  a1111: "Classic Automatic1111 WebUI tag-based prompting."
};
