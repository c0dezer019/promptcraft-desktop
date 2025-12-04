use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use super::super::{GenerationProvider, GenerationRequest, GenerationResult};

/// Google AI configuration (for Veo video generation)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoogleConfig {
    pub api_key: String,
    pub project_id: Option<String>,
}

/// Google provider (Veo for video generation via Gemini API)
pub struct GoogleProvider {
    config: Option<GoogleConfig>,
    client: reqwest::Client,
}

impl GoogleProvider {
    pub fn new() -> Self {
        Self {
            config: None,
            client: reqwest::Client::new(),
        }
    }

    pub fn with_config(config: GoogleConfig) -> Self {
        Self {
            config: Some(config),
            client: reqwest::Client::new(),
        }
    }

    /// Generate video using Veo via Gemini API
    async fn generate_video(&self, prompt: &str, params: &serde_json::Value) -> Result<GenerationResult> {
        let config = self.config.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Google API key not configured"))?;

        // Aspect ratio: 16:9 (default) or 9:16
        let aspect_ratio = params.get("aspect_ratio")
            .or_else(|| params.get("aspectRatio"))
            .and_then(|v| v.as_str())
            .unwrap_or("16:9");

        // Resolution: 720p (default) or 1080p
        let resolution = params.get("resolution")
            .and_then(|v| v.as_str())
            .unwrap_or("720p");

        // Duration in seconds: 4, 6, or 8
        let duration_seconds = params.get("duration")
            .or_else(|| params.get("durationSeconds"))
            .and_then(|v| v.as_u64())
            .unwrap_or(8)
            .to_string();

        // Build the request body for Gemini API
        let request_body = serde_json::json!({
            "instances": [{
                "prompt": prompt
            }],
            "parameters": {
                "aspectRatio": aspect_ratio,
                "resolution": resolution,
                "durationSeconds": duration_seconds
            }
        });

        // Use the Gemini API endpoint for Veo
        let model = params.get("model")
            .and_then(|v| v.as_str())
            .unwrap_or("veo-3.1-generate-preview");

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:predictLongRunning",
            model
        );

        let response = self.client
            .post(&url)
            .header("x-goog-api-key", &config.api_key)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        let status = response.status();

        if !status.is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!("Google Veo API error ({}): {}", status, error_text));
        }

        let response_data: serde_json::Value = response.json().await?;

        // Veo returns a long-running operation
        // Extract the operation name for polling
        let operation_name = response_data.get("name")
            .and_then(|n| n.as_str())
            .ok_or_else(|| anyhow::anyhow!("No operation name in Veo response"))?;

        // Poll for completion
        let result = self.poll_video_generation(operation_name).await?;

        Ok(result)
    }

    /// Poll for video generation completion
    async fn poll_video_generation(&self, operation_name: &str) -> Result<GenerationResult> {
        let config = self.config.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Google API key not configured"))?;

        let mut delay_ms = 10000u64; // Start with 10 seconds (video generation is slower)
        let max_delay_ms = 60000u64; // Max 60 seconds between polls
        let max_attempts = 60; // ~30 minutes max wait time

        for attempt in 0..max_attempts {
            tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;

            // Poll the operation status
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/{}",
                operation_name
            );

            let response = self.client
                .get(&url)
                .header("x-goog-api-key", &config.api_key)
                .send()
                .await?;

            let status = response.status();

            if !status.is_success() {
                let error_text = response.text().await?;
                return Err(anyhow::anyhow!("Google Veo poll error ({}): {}", status, error_text));
            }

            let response_data: serde_json::Value = response.json().await?;

            // Check if operation is done
            let done = response_data.get("done")
                .and_then(|d| d.as_bool())
                .unwrap_or(false);

            if done {
                // Check for error
                if let Some(error) = response_data.get("error") {
                    let error_msg = error.get("message")
                        .and_then(|m| m.as_str())
                        .unwrap_or("Video generation failed");
                    return Err(anyhow::anyhow!("Veo generation failed: {}", error_msg));
                }

                // Extract the result
                let result = response_data.get("response")
                    .or_else(|| response_data.get("result"));

                // Try to find the video URL in various possible locations
                let output_url = result
                    .and_then(|r| {
                        // Try predictions array first
                        r.get("predictions")
                            .and_then(|p| p.get(0))
                            .and_then(|pred| pred.get("videoUri").or_else(|| pred.get("video_uri")))
                            .or_else(|| r.get("videoUri"))
                            .or_else(|| r.get("video_uri"))
                            .or_else(|| r.get("output"))
                    })
                    .and_then(|url| url.as_str())
                    .map(|s| s.to_string());

                return Ok(GenerationResult {
                    output_url,
                    output_data: None,
                    metadata: response_data,
                });
            }

            // Not done yet, continue polling with exponential backoff
            delay_ms = std::cmp::min(delay_ms + 5000, max_delay_ms);

            if attempt % 6 == 0 {
                eprintln!("Veo generation in progress... (attempt {})", attempt);
            }
        }

        Err(anyhow::anyhow!("Video generation timed out after {} attempts", max_attempts))
    }
}

#[async_trait]
impl GenerationProvider for GoogleProvider {
    fn name(&self) -> &str {
        "google"
    }

    async fn is_available(&self) -> bool {
        self.config.is_some()
    }

    async fn generate(&self, request: GenerationRequest) -> Result<GenerationResult> {
        match request.model.as_str() {
            // Veo video generation models
            "veo" | "veo-2" | "veo-2.0-generate-exp" |
            "veo-3" | "veo-3.1" | "veo-3.1-generate-preview" => {
                self.generate_video(&request.prompt, &request.parameters).await
            }
            _ => Err(anyhow::anyhow!(
                "Unsupported Google model: {}. Use 'veo-3.1-generate-preview' for video generation.",
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
                    "description": "Your Google AI / Gemini API key"
                },
                "project_id": {
                    "type": "string",
                    "title": "Project ID (optional)"
                }
            },
            "required": ["api_key"]
        })
    }
}
