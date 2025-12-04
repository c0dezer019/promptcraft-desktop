use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use super::super::{GenerationProvider, GenerationRequest, GenerationResult};

/// Grok configuration (xAI)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrokConfig {
    pub api_key: String,
}

/// Grok provider (xAI's Aurora image generation)
pub struct GrokProvider {
    config: Option<GrokConfig>,
    client: reqwest::Client,
}

impl GrokProvider {
    pub fn new() -> Self {
        Self {
            config: None,
            client: reqwest::Client::new(),
        }
    }

    pub fn with_config(config: GrokConfig) -> Self {
        Self {
            config: Some(config),
            client: reqwest::Client::new(),
        }
    }

    /// Generate image using Grok Aurora (grok-2-image)
    async fn generate_image(&self, prompt: &str, params: &serde_json::Value) -> Result<GenerationResult> {
        let config = self.config.as_ref()
            .ok_or_else(|| anyhow::anyhow!("xAI API key not configured"))?;

        // Number of images to generate (1-10)
        let n = params.get("n")
            .and_then(|v| v.as_u64())
            .unwrap_or(1)
            .min(10) as usize;

        // Response format: url (default) or b64_json
        let response_format = params.get("response_format")
            .and_then(|v| v.as_str())
            .unwrap_or("url");

        let request_body = serde_json::json!({
            "model": "grok-2-image",
            "prompt": prompt,
            "n": n,
            "response_format": response_format
        });

        let response = self.client
            .post("https://api.x.ai/v1/images/generations")
            .header("Authorization", format!("Bearer {}", config.api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        let status = response.status();

        if !status.is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!("xAI Grok API error ({}): {}", status, error_text));
        }

        let response_data: serde_json::Value = response.json().await?;

        // Extract the image URL or base64 data
        let output_url = response_data
            .get("data")
            .and_then(|data| data.get(0))
            .and_then(|item| item.get("url"))
            .and_then(|url| url.as_str())
            .map(|s| s.to_string());

        let output_data = response_data
            .get("data")
            .and_then(|data| data.get(0))
            .and_then(|item| item.get("b64_json"))
            .and_then(|b64| b64.as_str())
            .map(|s| s.to_string());

        Ok(GenerationResult {
            output_url,
            output_data,
            metadata: response_data,
        })
    }
}

#[async_trait]
impl GenerationProvider for GrokProvider {
    fn name(&self) -> &str {
        "grok"
    }

    async fn is_available(&self) -> bool {
        self.config.is_some()
    }

    async fn generate(&self, request: GenerationRequest) -> Result<GenerationResult> {
        match request.model.as_str() {
            // Image generation models
            "grok-2-image" | "grok-2-image-1212" | "grok-image" | "aurora" => {
                self.generate_image(&request.prompt, &request.parameters).await
            }
            // Legacy/alias support
            "grok-1" | "grok" | "flux" => {
                eprintln!("Note: Using grok-2-image for Grok image generation");
                self.generate_image(&request.prompt, &request.parameters).await
            }
            _ => Err(anyhow::anyhow!(
                "Unsupported Grok model: {}. Use 'grok-2-image' for image generation.",
                request.model
            )),
        }
    }

    fn config_schema(&self) -> serde_json::Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "api_key": {
                    "type": "string",
                    "title": "API Key",
                    "description": "Your xAI API key"
                }
            },
            "required": ["api_key"]
        })
    }
}
