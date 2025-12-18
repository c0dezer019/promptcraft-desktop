use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use super::super::{GenerationProvider, GenerationRequest, GenerationResult};

/// InvokeAI provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvokeAIConfig {
    pub api_url: String,
}

/// InvokeAI provider
pub struct InvokeAIProvider {
    config: Option<InvokeAIConfig>,
    client: reqwest::Client,
}

impl InvokeAIProvider {
    #[allow(dead_code)]
    pub fn new() -> Self {
        Self {
            config: None,
            client: reqwest::Client::new(),
        }
    }

    pub fn with_config(config: InvokeAIConfig) -> Self {
        Self {
            config: Some(config),
            client: reqwest::Client::new(),
        }
    }

    /// Generate image using InvokeAI txt2img endpoint
    async fn generate_image(
        &self,
        prompt: &str,
        params: &serde_json::Value,
    ) -> Result<GenerationResult> {
        let config = self
            .config
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("InvokeAI API URL not configured"))?;

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
            .ok_or_else(|| anyhow::anyhow!("Model required for InvokeAI"))?;

        // Build request body for InvokeAI v3+ API
        let request_body = serde_json::json!({
            "model": model,
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "steps": steps,
            "cfg_scale": cfg_scale,
            "width": width,
            "height": height,
            "scheduler": sampler,
            "seed": seed,
        });

        // Send request to InvokeAI API
        let url = format!("{}/api/v1/generate", config.api_url);
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
                "InvokeAI API error ({}): {}",
                status,
                error_text
            ));
        }

        let response_data: serde_json::Value = response.json().await?;

        // InvokeAI returns image info including URL or base64
        let image_url = response_data
            .get("image")
            .and_then(|v| v.get("url"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let image_data = response_data
            .get("image")
            .and_then(|v| v.get("data"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        Ok(GenerationResult {
            output_url: image_url,
            output_data: image_data,
            metadata: serde_json::json!({
                "provider": "invokeai",
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
}

#[async_trait]
impl GenerationProvider for InvokeAIProvider {
    fn name(&self) -> &str {
        "invokeai"
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
                    "description": "InvokeAI API URL",
                    "default": "http://127.0.0.1:9090"
                }
            },
            "required": ["api_url"]
        })
    }
}
