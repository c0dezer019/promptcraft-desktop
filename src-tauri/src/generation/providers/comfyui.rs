use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::time::sleep;

use super::super::{GenerationProvider, GenerationRequest, GenerationResult};

/// ComfyUI provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComfyUIConfig {
    pub api_url: String,
}

/// ComfyUI provider
pub struct ComfyUIProvider {
    config: Option<ComfyUIConfig>,
    client: reqwest::Client,
}

impl ComfyUIProvider {
    pub fn new() -> Self {
        Self {
            config: None,
            client: reqwest::Client::new(),
        }
    }

    pub fn with_config(config: ComfyUIConfig) -> Self {
        Self {
            config: Some(config),
            client: reqwest::Client::new(),
        }
    }

    /// Generate image using ComfyUI workflow
    async fn generate_image(
        &self,
        prompt: &str,
        params: &serde_json::Value,
    ) -> Result<GenerationResult> {
        let config = self
            .config
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("ComfyUI API URL not configured"))?;

        // Extract parameters
        let negative_prompt = params
            .get("negative_prompt")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let steps = params.get("steps").and_then(|v| v.as_u64()).unwrap_or(20) as u32;

        let cfg_scale = params
            .get("cfg_scale")
            .and_then(|v| v.as_f64())
            .unwrap_or(7.0) as f32;

        let width = params.get("width").and_then(|v| v.as_u64()).unwrap_or(512) as u32;

        let height = params.get("height").and_then(|v| v.as_u64()).unwrap_or(512) as u32;

        let sampler = params
            .get("sampler")
            .and_then(|v| v.as_str())
            .unwrap_or("euler");

        let seed = params.get("seed").and_then(|v| v.as_i64()).unwrap_or(-1);

        let model = params
            .get("model")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Model checkpoint required for ComfyUI"))?;

        // Build basic txt2img workflow
        let workflow = self.build_txt2img_workflow(
            prompt,
            negative_prompt,
            model,
            steps,
            cfg_scale,
            width,
            height,
            sampler,
            seed,
        );

        // Submit workflow to ComfyUI
        let prompt_url = format!("{}/prompt", config.api_url);
        let response = self
            .client
            .post(&prompt_url)
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "prompt": workflow
            }))
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!(
                "ComfyUI API error ({}): {}",
                status,
                error_text
            ));
        }

        let response_data: serde_json::Value = response.json().await?;
        let prompt_id = response_data
            .get("prompt_id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("No prompt_id in response"))?;

        // Poll for completion
        let output_images = self.poll_for_completion(config, prompt_id).await?;

        let first_image = output_images
            .first()
            .ok_or_else(|| anyhow::anyhow!("No images generated"))?;

        Ok(GenerationResult {
            output_url: Some(first_image.clone()),
            output_data: None,
            metadata: serde_json::json!({
                "provider": "comfyui",
                "prompt_id": prompt_id,
                "parameters": {
                    "prompt": prompt,
                    "negative_prompt": negative_prompt,
                    "model": model,
                    "steps": steps,
                    "cfg_scale": cfg_scale,
                    "width": width,
                    "height": height,
                    "sampler": sampler,
                    "seed": seed,
                }
            }),
        })
    }

    /// Build a basic txt2img workflow for ComfyUI
    fn build_txt2img_workflow(
        &self,
        prompt: &str,
        negative_prompt: &str,
        model: &str,
        steps: u32,
        cfg: f32,
        width: u32,
        height: u32,
        sampler: &str,
        seed: i64,
    ) -> serde_json::Value {
        serde_json::json!({
            "1": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {
                    "ckpt_name": model
                }
            },
            "2": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "text": prompt,
                    "clip": ["1", 1]
                }
            },
            "3": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "text": negative_prompt,
                    "clip": ["1", 1]
                }
            },
            "4": {
                "class_type": "EmptyLatentImage",
                "inputs": {
                    "width": width,
                    "height": height,
                    "batch_size": 1
                }
            },
            "5": {
                "class_type": "KSampler",
                "inputs": {
                    "seed": seed,
                    "steps": steps,
                    "cfg": cfg,
                    "sampler_name": sampler,
                    "scheduler": "normal",
                    "denoise": 1.0,
                    "model": ["1", 0],
                    "positive": ["2", 0],
                    "negative": ["3", 0],
                    "latent_image": ["4", 0]
                }
            },
            "6": {
                "class_type": "VAEDecode",
                "inputs": {
                    "samples": ["5", 0],
                    "vae": ["1", 2]
                }
            },
            "7": {
                "class_type": "SaveImage",
                "inputs": {
                    "filename_prefix": "ComfyUI",
                    "images": ["6", 0]
                }
            }
        })
    }

    /// Poll ComfyUI for workflow completion
    async fn poll_for_completion(
        &self,
        config: &ComfyUIConfig,
        prompt_id: &str,
    ) -> Result<Vec<String>> {
        let history_url = format!("{}/history/{}", config.api_url, prompt_id);
        let max_attempts = 60; // 60 seconds max
        let mut attempts = 0;

        loop {
            if attempts >= max_attempts {
                return Err(anyhow::anyhow!("Timeout waiting for generation"));
            }

            sleep(Duration::from_secs(1)).await;
            attempts += 1;

            let response = self.client.get(&history_url).send().await?;

            if !response.status().is_success() {
                continue;
            }

            let history: serde_json::Value = response.json().await?;

            // Check if this prompt_id exists in history
            if let Some(prompt_history) = history.get(prompt_id) {
                // Check if outputs exist
                if let Some(outputs) = prompt_history.get("outputs") {
                    // Find SaveImage node output
                    if let Some(save_image) = outputs.get("7") {
                        if let Some(images) = save_image.get("images").and_then(|v| v.as_array()) {
                            let image_urls: Vec<String> = images
                                .iter()
                                .filter_map(|img| {
                                    let filename = img.get("filename")?.as_str()?;
                                    let subfolder = img.get("subfolder")?.as_str()?;
                                    Some(format!(
                                        "{}/view?filename={}&subfolder={}&type=output",
                                        config.api_url, filename, subfolder
                                    ))
                                })
                                .collect();

                            if !image_urls.is_empty() {
                                return Ok(image_urls);
                            }
                        }
                    }
                }
            }
        }
    }
}

#[async_trait]
impl GenerationProvider for ComfyUIProvider {
    fn name(&self) -> &str {
        "comfyui"
    }

    async fn is_available(&self) -> bool {
        self.config.is_some()
    }

    async fn generate(&self, request: GenerationRequest) -> Result<GenerationResult> {
        self.generate_image(&request.prompt, &request.parameters)
            .await
    }

    fn config_schema(&self) -> serde_json::Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "api_url": {
                    "type": "string",
                    "title": "API URL",
                    "description": "ComfyUI API URL",
                    "default": "http://127.0.0.1:8188"
                }
            },
            "required": ["api_url"]
        })
    }
}
