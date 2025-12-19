use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use super::super::{GenerationProvider, GenerationRequest, GenerationResult};
use crate::generation::utils::extract_reference_images;

/// Google AI configuration (for Veo video generation and Nano Banana image generation)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoogleConfig {
    pub api_key: String,
    pub project_id: Option<String>,
}

/// Google provider (Veo for video generation, Nano Banana for image generation via Gemini API)
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

    /// Generate image using Nano Banana (Gemini 2.5 Flash or Gemini 3 Pro Image)
    async fn generate_image(
        &self,
        model: &str,
        prompt: &str,
        params: &serde_json::Value,
    ) -> Result<GenerationResult> {
        let config = self
            .config
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("Google API key not configured"))?;

        // Number of images to generate
        let n = params.get("n").and_then(|v| v.as_u64()).unwrap_or(1);

        // Resolution (for Gemini 3 Pro Image only): 1K, 2K, 4K
        let resolution = params
            .get("resolution")
            .and_then(|v| v.as_str());

        // Google Search tool
        let use_google_search = params
            .get("google_search")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        // Build the request body
        // When Google Search is enabled, we need to support both TEXT and IMAGE modalities
        let response_modalities = if use_google_search {
            vec!["TEXT", "IMAGE"]
        } else {
            vec!["IMAGE"]
        };

        let mut generation_config = serde_json::json!({
            "candidateCount": n,
            "responseModalities": response_modalities
        });

        // Add resolution for Gemini 3 Pro Image
        if model.contains("gemini-3") || model.contains("pro-image") {
            if let Some(res) = resolution {
                generation_config["resolution"] = serde_json::Value::String(res.to_string());
            }
        }

        // Build parts array for the request
        let mut parts = vec![serde_json::json!({
            "text": prompt
        })];

        // Add reference images if present (Gemini supports up to 14)
        if let Some(images) = extract_reference_images(params) {
            let image_count = images.len().min(14); // Limit to 14 images
            eprintln!("Adding {} reference images to Gemini request", image_count);

            for (index, (mime_type, base64_data)) in images.iter().take(image_count).enumerate() {
                eprintln!("  Image {}: MIME={}", index + 1, mime_type);
                parts.push(serde_json::json!({
                    "inlineData": {
                        "mimeType": mime_type,
                        "data": base64_data
                    }
                }));
            }
        }

        // Build request body with optional Google Search tool
        let mut request_body = serde_json::json!({
            "contents": [{
                "parts": parts
            }],
            "generationConfig": generation_config
        });

        // Add Google Search tool if enabled
        if use_google_search {
            request_body["tools"] = serde_json::json!([{
                "google_search": {}
            }]);
        }

        // Use the Gemini API endpoint
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent",
            model
        );

        let response = self
            .client
            .post(&url)
            .header("x-goog-api-key", &config.api_key)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        let status = response.status();

        if !status.is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!(
                "Google Nano Banana API error ({}): {}",
                status,
                error_text
            ));
        }

        let response_data: serde_json::Value = response.json().await?;

        // Extract image data from response
        // The Gemini API returns images in candidates[].content.parts[] with inline_data.data
        let candidates = response_data
            .get("candidates")
            .and_then(|c| c.as_array())
            .ok_or_else(|| {
                anyhow::anyhow!(
                    "No candidates in Gemini response. Full response: {}",
                    serde_json::to_string_pretty(&response_data).unwrap_or_default()
                )
            })?;

        // Get the first candidate
        let first_candidate = candidates
            .get(0)
            .ok_or_else(|| anyhow::anyhow!("No candidates in response"))?;

        // Extract the image from content.parts[]
        let parts = first_candidate
            .get("content")
            .and_then(|c| c.get("parts"))
            .and_then(|p| p.as_array())
            .ok_or_else(|| anyhow::anyhow!("No content.parts in candidate"))?;

        // Log any text parts (e.g., from Google Search results)
        for part in parts.iter() {
            if let Some(text) = part.get("text").and_then(|t| t.as_str()) {
                eprintln!("Gemini text response: {}", text);
            }
        }

        // Find the first part with inlineData (the generated image)
        let image_data = parts
            .iter()
            .find_map(|part| {
                part.get("inlineData")
                    .and_then(|inline| inline.get("data"))
                    .and_then(|data| data.as_str())
            })
            .ok_or_else(|| anyhow::anyhow!("No inlineData.data found in response parts"))?;

        Ok(GenerationResult {
            output_url: None,
            output_data: Some(image_data.to_string()), // Base64 encoded image
            file_path: None,
            metadata: response_data,
        })
    }

    /// Generate video using Veo via Gemini API
    async fn generate_video(
        &self,
        prompt: &str,
        params: &serde_json::Value,
    ) -> Result<GenerationResult> {
        let config = self
            .config
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("Google API key not configured"))?;

        // Aspect ratio: 16:9 (default) or 9:16
        let aspect_ratio = params
            .get("aspect_ratio")
            .or_else(|| params.get("aspectRatio"))
            .and_then(|v| v.as_str())
            .unwrap_or("16:9");

        // Resolution: 720p (default) or 1080p
        let resolution = params
            .get("resolution")
            .and_then(|v| v.as_str())
            .unwrap_or("720p");

        // Duration in seconds: 4, 6, or 8
        let duration_seconds = params
            .get("duration")
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
        let model = params
            .get("model")
            .and_then(|v| v.as_str())
            .unwrap_or("veo-3.1-generate-preview");

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:predictLongRunning",
            model
        );

        let response = self
            .client
            .post(&url)
            .header("x-goog-api-key", &config.api_key)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        let status = response.status();

        if !status.is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!(
                "Google Veo API error ({}): {}",
                status,
                error_text
            ));
        }

        let response_data: serde_json::Value = response.json().await?;

        // Veo returns a long-running operation
        // Extract the operation name for polling
        let operation_name = response_data
            .get("name")
            .and_then(|n| n.as_str())
            .ok_or_else(|| anyhow::anyhow!("No operation name in Veo response"))?;

        // Poll for completion
        let result = self.poll_video_generation(operation_name).await?;

        Ok(result)
    }

    /// Poll for video generation completion
    async fn poll_video_generation(&self, operation_name: &str) -> Result<GenerationResult> {
        let config = self
            .config
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("Google API key not configured"))?;

        let mut delay_ms = 10000u64; // Start with 10 seconds (video generation is slower)
        let max_delay_ms = 60000u64; // Max 60 seconds between polls
        let max_attempts = 60; // ~30 minutes max wait time

        for attempt in 0..max_attempts {
            tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;

            // Poll the operation status
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{}",
                operation_name
            );

            let response = self
                .client
                .get(&url)
                .header("x-goog-api-key", &config.api_key)
                .send()
                .await?;

            let status = response.status();

            if !status.is_success() {
                let error_text = response.text().await?;
                return Err(anyhow::anyhow!(
                    "Google Veo poll error ({}): {}",
                    status,
                    error_text
                ));
            }

            let response_data: serde_json::Value = response.json().await?;

            // Check if operation is done
            let done = response_data
                .get("done")
                .and_then(|d| d.as_bool())
                .unwrap_or(false);

            if done {
                // Check for error
                if let Some(error) = response_data.get("error") {
                    let error_msg = error
                        .get("message")
                        .and_then(|m| m.as_str())
                        .unwrap_or("Video generation failed");
                    return Err(anyhow::anyhow!("Veo generation failed: {}", error_msg));
                }

                // Extract the result
                let result = response_data
                    .get("response")
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
                    file_path: None,
                    metadata: response_data,
                });
            }

            // Not done yet, continue polling with exponential backoff
            delay_ms = std::cmp::min(delay_ms + 5000, max_delay_ms);

            if attempt % 6 == 0 {
                eprintln!("Veo generation in progress... (attempt {})", attempt);
            }
        }

        Err(anyhow::anyhow!(
            "Video generation timed out after {} attempts",
            max_attempts
        ))
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
            // Nano Banana image generation models
            "gemini-2.5-flash-image" | "gemini-3-pro-image-preview" => {
                self.generate_image(&request.model, &request.prompt, &request.parameters).await
            }
            // Veo video generation models
            "veo" | "veo-2" | "veo-2.0-generate-exp" |
            "veo-3" | "veo-3.1" | "veo-3.1-generate-preview" => {
                self.generate_video(&request.prompt, &request.parameters).await
            }
            _ => Err(anyhow::anyhow!(
                "Unsupported Google model: {}. Use 'gemini-2.5-flash-image' or 'gemini-3-pro-image-preview' for images, or 'veo-3.1-generate-preview' for video generation.",
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
