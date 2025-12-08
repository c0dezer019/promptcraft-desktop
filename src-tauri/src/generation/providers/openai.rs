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

/// OpenAI provider (gpt-image-1 for images, Sora for video)
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

    /// Generate image using gpt-image-1
    async fn generate_image(
        &self,
        prompt: &str,
        params: &serde_json::Value,
    ) -> Result<GenerationResult> {
        let config = self
            .config
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("OpenAI API key not configured"))?;

        // Size options: 1024x1024, 1536x1024 (landscape), 1024x1536 (portrait), auto
        let size = params
            .get("size")
            .and_then(|v| v.as_str())
            .unwrap_or("auto");

        // Quality options: low, medium, high
        let quality = params
            .get("quality")
            .and_then(|v| v.as_str())
            .unwrap_or("high");

        let n = params.get("n").and_then(|v| v.as_u64()).unwrap_or(1) as usize;

        let request_body = serde_json::json!({
            "model": "gpt-image-1",
            "prompt": prompt,
            "n": n,
            "size": size,
            "quality": quality,
        });

        let mut request = self
            .client
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
            return Err(anyhow::anyhow!(
                "OpenAI API error ({}): {}",
                status,
                error_text
            ));
        }

        let response_data: serde_json::Value = response.json().await?;

        // gpt-image-1 returns base64 data by default, check for both url and b64_json
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

    /// Generate video using Sora
    async fn generate_video(
        &self,
        prompt: &str,
        params: &serde_json::Value,
    ) -> Result<GenerationResult> {
        let config = self
            .config
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("OpenAI API key not configured"))?;

        // Duration in seconds (typically 4, 5, 8, 10, or 12)
        let duration = params.get("duration").and_then(|v| v.as_u64()).unwrap_or(5);

        // Resolution: 720p or 1080p
        let resolution = params
            .get("resolution")
            .and_then(|v| v.as_str())
            .unwrap_or("1080p");

        // Aspect ratio: 16:9 or 9:16
        let aspect_ratio = params
            .get("aspect_ratio")
            .and_then(|v| v.as_str())
            .unwrap_or("16:9");

        let request_body = serde_json::json!({
            "model": "sora-2",
            "prompt": prompt,
            "duration": duration,
            "resolution": resolution,
            "aspect_ratio": aspect_ratio,
        });

        let mut request = self
            .client
            .post("https://api.openai.com/v1/videos")
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
            return Err(anyhow::anyhow!(
                "OpenAI Sora API error ({}): {}",
                status,
                error_text
            ));
        }

        let response_data: serde_json::Value = response.json().await?;

        // Sora returns an operation ID for async processing
        // We need to poll for the result
        let operation_id = response_data
            .get("id")
            .and_then(|id| id.as_str())
            .ok_or_else(|| anyhow::anyhow!("No operation ID in Sora response"))?;

        // Poll for completion with exponential backoff
        let result = self.poll_video_generation(operation_id).await?;

        Ok(result)
    }

    /// Poll for video generation completion
    async fn poll_video_generation(&self, operation_id: &str) -> Result<GenerationResult> {
        let config = self
            .config
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("OpenAI API key not configured"))?;

        let mut delay_ms = 5000u64; // Start with 5 seconds
        let max_delay_ms = 60000u64; // Max 60 seconds between polls
        let max_attempts = 60; // ~30 minutes max wait time

        for attempt in 0..max_attempts {
            tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;

            let mut request = self
                .client
                .get(format!("https://api.openai.com/v1/videos/{}", operation_id))
                .header("Authorization", format!("Bearer {}", config.api_key));

            if let Some(org) = &config.organization {
                request = request.header("OpenAI-Organization", org);
            }

            let response = request.send().await?;
            let status = response.status();

            if !status.is_success() {
                let error_text = response.text().await?;
                return Err(anyhow::anyhow!(
                    "OpenAI Sora poll error ({}): {}",
                    status,
                    error_text
                ));
            }

            let response_data: serde_json::Value = response.json().await?;
            let gen_status = response_data
                .get("status")
                .and_then(|s| s.as_str())
                .unwrap_or("unknown");

            match gen_status {
                "completed" | "succeeded" => {
                    let output_url = response_data
                        .get("output")
                        .or_else(|| response_data.get("video_url"))
                        .or_else(|| response_data.get("result").and_then(|r| r.get("url")))
                        .and_then(|url| url.as_str())
                        .map(|s| s.to_string());

                    return Ok(GenerationResult {
                        output_url,
                        output_data: None,
                        metadata: response_data,
                    });
                }
                "failed" | "error" => {
                    let error_msg = response_data
                        .get("error")
                        .and_then(|e| e.as_str())
                        .unwrap_or("Video generation failed");
                    return Err(anyhow::anyhow!("Sora generation failed: {}", error_msg));
                }
                "processing" | "pending" | "running" => {
                    // Still processing, continue polling with exponential backoff
                    delay_ms = std::cmp::min(delay_ms * 2, max_delay_ms);
                }
                _ => {
                    // Unknown status, log and continue
                    eprintln!("Unknown Sora status: {} (attempt {})", gen_status, attempt);
                }
            }
        }

        Err(anyhow::anyhow!(
            "Video generation timed out after {} attempts",
            max_attempts
        ))
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
            // Image generation models
            "gpt-image-1" | "gpt-image-1-mini" => {
                self.generate_image(&request.prompt, &request.parameters).await
            }
            // Video generation models
            "sora-2" | "sora-2-pro" | "sora" => {
                self.generate_video(&request.prompt, &request.parameters).await
            }
            // Legacy support - redirect to new model
            "dall-e-3" | "dall-e-2" => {
                eprintln!("Warning: DALL-E models are deprecated, using gpt-image-1 instead");
                self.generate_image(&request.prompt, &request.parameters).await
            }
            _ => Err(anyhow::anyhow!("Unsupported OpenAI model: {}. Use 'gpt-image-1' for images or 'sora-2' for videos.", request.model)),
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
