use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

pub mod processor;
pub mod providers;
pub mod utils;

/// Generation request parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationRequest {
    pub prompt: String,
    pub model: String,
    pub parameters: serde_json::Value,
}

/// Generation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationResult {
    pub output_url: Option<String>,
    pub output_data: Option<String>,
    pub file_path: Option<String>,
    pub metadata: serde_json::Value,
}

/// Progress update for streaming generation
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationProgress {
    pub percentage: f32,
    pub message: String,
}

/// Provider trait that all generation backends implement
#[async_trait]
pub trait GenerationProvider: Send + Sync {
    /// Provider name (e.g., "openai", "google", "grok")
    fn name(&self) -> &str;

    /// Check if provider is available (API key configured, etc.)
    #[allow(dead_code)]
    async fn is_available(&self) -> bool;

    /// Generate content based on request
    async fn generate(&self, request: GenerationRequest) -> Result<GenerationResult>;

    /// Get provider-specific configuration schema
    #[allow(dead_code)]
    fn config_schema(&self) -> serde_json::Value;
}

/// Generation service that manages all providers
pub struct GenerationService {
    providers: std::collections::HashMap<String, Box<dyn GenerationProvider>>,
}

impl GenerationService {
    pub fn new() -> Self {
        Self {
            providers: std::collections::HashMap::new(),
        }
    }

    /// Register a new provider
    pub fn register_provider(&mut self, provider: Box<dyn GenerationProvider>) {
        let name = provider.name().to_string();
        self.providers.insert(name, provider);
    }

    /// Get provider by name
    pub fn get_provider(&self, name: &str) -> Option<&Box<dyn GenerationProvider>> {
        self.providers.get(name)
    }

    /// List all available providers
    pub fn list_providers(&self) -> Vec<String> {
        self.providers.keys().cloned().collect()
    }

    /// Configure a provider with an API key
    pub fn configure_provider(&mut self, provider_name: &str, api_key: String) -> Result<()> {
        use providers::*;

        // Remove old provider and register new one with config
        self.providers.remove(provider_name);

        match provider_name {
            "anthropic" => {
                let provider = anthropic::AnthropicProvider::with_config(anthropic::AnthropicConfig {
                    api_key,
                });
                self.register_provider(Box::new(provider));
            }
            "openai" => {
                let provider = openai::OpenAIProvider::with_config(openai::OpenAIConfig {
                    api_key,
                    organization: None,
                });
                self.register_provider(Box::new(provider));
            }
            "google" => {
                let provider = google::GoogleProvider::with_config(google::GoogleConfig {
                    api_key,
                    project_id: None,
                });
                self.register_provider(Box::new(provider));
            }
            "grok" => {
                let provider = grok::GrokProvider::with_config(grok::GrokConfig { api_key });
                self.register_provider(Box::new(provider));
            }
            _ => return Err(anyhow::anyhow!("Unknown provider: {}", provider_name)),
        }

        Ok(())
    }

    /// Configure a local provider with an API URL
    pub fn configure_local_provider(&mut self, provider_name: &str, api_url: String) -> Result<()> {
        use providers::*;

        // Remove old provider and register new one with config
        self.providers.remove(provider_name);

        match provider_name {
            "a1111" => {
                let provider = a1111::A1111Provider::with_config(a1111::A1111Config { api_url });
                self.register_provider(Box::new(provider));
            }
            "comfyui" => {
                let provider =
                    comfyui::ComfyUIProvider::with_config(comfyui::ComfyUIConfig { api_url });
                self.register_provider(Box::new(provider));
            }
            "invokeai" => {
                let provider =
                    invokeai::InvokeAIProvider::with_config(invokeai::InvokeAIConfig { api_url });
                self.register_provider(Box::new(provider));
            }
            _ => return Err(anyhow::anyhow!("Unknown local provider: {}", provider_name)),
        }

        Ok(())
    }

    /// Generate using a specific provider
    pub async fn generate(
        &self,
        provider_name: &str,
        request: GenerationRequest,
    ) -> Result<GenerationResult> {
        let provider = self
            .get_provider(provider_name)
            .ok_or_else(|| anyhow::anyhow!("Provider not found: {}", provider_name))?;

        let mut result = provider.generate(request).await?;

        // Convert base64 output_data to file if present
        if let Some(base64_data) = &result.output_data {
            if !base64_data.is_empty() {
                match save_base64_to_file(base64_data).await {
                    Ok(file_path) => {
                        // Convert to Tauri asset protocol URL (https://asset.localhost/...)
                        // This format is required for Tauri v2 to load local files in the webview
                        let file_path_str = file_path.display().to_string();
                        result.output_url = Some(format!("asset://localhost/{}", file_path_str));
                        // Store the actual file path for opening with system applications
                        result.file_path = Some(file_path_str);
                        // Clear the base64 data to save space
                        result.output_data = None;
                    }
                    Err(e) => {
                        eprintln!("Warning: Failed to save base64 to file: {}", e);
                        // Continue with base64 data in output_data
                    }
                }
            }
        }

        Ok(result)
    }
}

/// Save base64 image data to a file and return the path
async fn save_base64_to_file(base64_data: &str) -> Result<PathBuf> {
    use base64::{Engine as _, engine::general_purpose};

    // Strip data URL prefix if present (e.g., "data:image/png;base64,")
    let base64_only = if let Some(comma_pos) = base64_data.find(',') {
        &base64_data[comma_pos + 1..]
    } else {
        base64_data
    };

    // Strip whitespace and newlines from base64 data
    let cleaned_data: String = base64_only
        .chars()
        .filter(|c| !c.is_whitespace())
        .collect();

    // Decode base64
    let image_bytes = general_purpose::STANDARD.decode(&cleaned_data)?;

    // Get Pictures/Promptcraft directory
    let home_dir = dirs::home_dir()
        .ok_or_else(|| anyhow::anyhow!("Could not get home directory"))?;

    let images_dir = home_dir.join("Pictures").join("Promptcraft");
    std::fs::create_dir_all(&images_dir)?;

    // Generate unique filename with random UUID to avoid collisions
    let uuid = uuid::Uuid::new_v4();
    let filename = format!("gen_{}.png", uuid);
    let file_path = images_dir.join(filename);

    // Write to file using tokio for async I/O
    tokio::fs::write(&file_path, &image_bytes).await?;

    Ok(file_path)
}
