use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use super::super::{GenerationProvider, GenerationRequest, GenerationResult};

/// Automatic1111 provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct A1111Config {
    pub api_url: String,
}

/// Automatic1111 Stable Diffusion WebUI provider
pub struct A1111Provider {
    config: Option<A1111Config>,
    client: reqwest::Client,
}

impl A1111Provider {
    #[allow(dead_code)]
    pub fn new() -> Self {
        Self {
            config: None,
            client: reqwest::Client::new(),
        }
    }

    pub fn with_config(config: A1111Config) -> Self {
        Self {
            config: Some(config),
            client: reqwest::Client::new(),
        }
    }

    /// Generate image using A1111 txt2img endpoint
    async fn generate_image(
        &self,
        prompt: &str,
        params: &serde_json::Value,
    ) -> Result<GenerationResult> {
        let config = self
            .config
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("A1111 API URL not configured"))?;

        // Extract parameters with defaults
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

        let sampler_name = params
            .get("sampler")
            .and_then(|v| v.as_str())
            .unwrap_or("Euler a");

        let seed = params.get("seed").and_then(|v| v.as_i64()).unwrap_or(-1) as i32;

        let model = params.get("model").and_then(|v| v.as_str());

        // Build request body
        let mut request_body = serde_json::json!({
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "steps": steps,
            "cfg_scale": cfg_scale,
            "width": width,
            "height": height,
            "sampler_name": sampler_name,
            "seed": seed,
            "n_iter": 1,
            "batch_size": 1,
        });

        // If model specified, set override_settings
        if let Some(model_name) = model {
            request_body["override_settings"] = serde_json::json!({
                "sd_model_checkpoint": model_name
            });
        }

        // Send request to A1111 API
        let url = format!("{}/sdapi/v1/txt2img", config.api_url);
        let response = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        let status = response.status();

        if !status.is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!(
                "A1111 API error ({}): {}",
                status,
                error_text
            ));
        }

        let response_data: serde_json::Value = response.json().await?;

        // A1111 returns base64-encoded images in the "images" array
        let images = response_data
            .get("images")
            .and_then(|v| v.as_array())
            .ok_or_else(|| anyhow::anyhow!("No images in response"))?;

        let first_image = images
            .first()
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Invalid image data"))?;

        // Get generation info
        let info = response_data
            .get("info")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        Ok(GenerationResult {
            output_url: None,
            output_data: Some(first_image.to_string()),
            metadata: serde_json::json!({
                "provider": "a1111",
                "info": info,
                "parameters": {
                    "prompt": prompt,
                    "negative_prompt": negative_prompt,
                    "steps": steps,
                    "cfg_scale": cfg_scale,
                    "width": width,
                    "height": height,
                    "sampler": sampler_name,
                    "seed": seed,
                }
            }),
        })
    }
}

#[async_trait]
impl GenerationProvider for A1111Provider {
    fn name(&self) -> &str {
        "a1111"
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
                    "description": "Automatic1111 WebUI API URL",
                    "default": "http://127.0.0.1:7860"
                }
            },
            "required": ["api_url"]
        })
    }
}
