use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use super::super::{GenerationProvider, GenerationRequest, GenerationResult};

/// Anthropic provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnthropicConfig {
    pub api_key: String,
}

/// Anthropic text generation response
#[derive(Debug, Deserialize)]
struct AnthropicResponse {
    id: String,
    content: Vec<ContentBlock>,
    model: String,
    stop_reason: Option<String>,
    usage: serde_json::Value,
}

#[derive(Debug, Deserialize)]
struct ContentBlock {
    #[serde(rename = "type")]
    _block_type: String,
    text: Option<String>,
}

/// Anthropic provider for Claude models (text generation)
pub struct AnthropicProvider {
    config: Option<AnthropicConfig>,
    client: reqwest::Client,
}

impl AnthropicProvider {
    pub fn new() -> Self {
        Self {
            config: None,
            client: reqwest::Client::new(),
        }
    }

    pub fn with_config(config: AnthropicConfig) -> Self {
        Self {
            config: Some(config),
            client: reqwest::Client::new(),
        }
    }

    /// Generate text using Claude models
    async fn generate_text(
        &self,
        prompt: &str,
        model: &str,
        params: &serde_json::Value,
    ) -> Result<GenerationResult> {
        let config = self
            .config
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("Anthropic API key not configured"))?;

        let max_tokens = params
            .get("max_tokens")
            .and_then(|v| v.as_u64())
            .unwrap_or(4096) as u32;

        let temperature = params
            .get("temperature")
            .and_then(|v| v.as_f64())
            .unwrap_or(1.0);

        let request_body = serde_json::json!({
            "model": model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        });

        let response = self
            .client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &config.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        let status = response.status();

        if !status.is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!(
                "Anthropic API error ({}): {}",
                status,
                error_text
            ));
        }

        let response_data: AnthropicResponse = response.json().await?;

        // Extract text from content blocks
        let text = response_data
            .content
            .iter()
            .filter_map(|block| block.text.clone())
            .collect::<Vec<_>>()
            .join("");

        // For text generation, we return the text in output_data
        Ok(GenerationResult {
            output_url: None,
            output_data: Some(text),
            metadata: serde_json::json!({
                "id": response_data.id,
                "model": response_data.model,
                "stop_reason": response_data.stop_reason,
                "usage": response_data.usage,
            }),
        })
    }
}

#[async_trait]
impl GenerationProvider for AnthropicProvider {
    fn name(&self) -> &str {
        "anthropic"
    }

    async fn is_available(&self) -> bool {
        self.config.is_some()
    }

    async fn generate(&self, request: GenerationRequest) -> Result<GenerationResult> {
        // Support Claude models for text generation
        self.generate_text(&request.prompt, &request.model, &request.parameters)
            .await
    }

    fn config_schema(&self) -> serde_json::Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "api_key": {
                    "type": "string",
                    "title": "API Key",
                    "description": "Your Anthropic API key"
                }
            },
            "required": ["api_key"]
        })
    }
}
