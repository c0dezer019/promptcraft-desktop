use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use super::super::{GenerationProvider, GenerationRequest, GenerationResult};

/// OpenAI provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAIConfig {
    pub api_key: String,
    pub organization: Option<String>,
}

/// OpenAI provider (DALL-E for images, GPT for text, future Sora support)
pub struct OpenAIProvider {
    config: Option<OpenAIConfig>,
    client: reqwest::Client,
}

impl OpenAIProvider {
    pub fn new() -> Self {
        Self {
            config: None,
            client: reqwest::Client::new(),
        }
    }

    pub fn with_config(config: OpenAIConfig) -> Self {
        Self {
            config: Some(config),
            client: reqwest::Client::new(),
        }
    }

    /// Generate image using DALL-E 3
    async fn generate_dalle(&self, prompt: &str, params: &serde_json::Value) -> Result<GenerationResult> {
        let config = self.config.as_ref()
            .ok_or_else(|| anyhow::anyhow!("OpenAI API key not configured"))?;

        let size = params.get("size")
            .and_then(|v| v.as_str())
            .unwrap_or("1024x1024");
        let quality = params.get("quality")
            .and_then(|v| v.as_str())
            .unwrap_or("standard");
        let n = params.get("n")
            .and_then(|v| v.as_u64())
            .unwrap_or(1) as usize;

        let request_body = serde_json::json!({
            "model": "dall-e-3",
            "prompt": prompt,
            "n": n,
            "size": size,
            "quality": quality,
        });

        let mut request = self.client
            .post("https://api.openai.com/v1/images/generations")
            .header("Authorization", format!("Bearer {}", config.api_key))
            .header("Content-Type", "application/json")
            .json(&request_body);

        if let Some(org) = &config.organization {
            request = request.header("OpenAI-Organization", org);
        }

        let response = request.send().await?;
        let status = response.status();

        if !status.is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!("OpenAI API error ({}): {}", status, error_text));
        }

        let response_data: serde_json::Value = response.json().await?;

        let output_url = response_data
            .get("data")
            .and_then(|data| data.get(0))
            .and_then(|item| item.get("url"))
            .and_then(|url| url.as_str())
            .map(|s| s.to_string());

        Ok(GenerationResult {
            output_url,
            output_data: None,
            metadata: response_data,
        })
    }
}

#[async_trait]
impl GenerationProvider for OpenAIProvider {
    fn name(&self) -> &str {
        "openai"
    }

    async fn is_available(&self) -> bool {
        self.config.is_some()
    }

    async fn generate(&self, request: GenerationRequest) -> Result<GenerationResult> {
        match request.model.as_str() {
            "dall-e-3" | "dall-e-2" => {
                self.generate_dalle(&request.prompt, &request.parameters).await
            }
            _ => Err(anyhow::anyhow!("Unsupported OpenAI model: {}", request.model)),
        }
    }

    fn config_schema(&self) -> serde_json::Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "api_key": {
                    "type": "string",
                    "title": "API Key",
                    "description": "Your OpenAI API key"
                },
                "organization": {
                    "type": "string",
                    "title": "Organization ID (optional)",
                    "description": "Your OpenAI organization ID"
                }
            },
            "required": ["api_key"]
        })
    }
}
