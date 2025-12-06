use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

pub mod providers;
pub mod processor;

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
            "openai" => {
                let provider = openai::OpenAIProvider::with_config(openai::OpenAIConfig {
                    api_key,
                    organization: None
                });
                self.register_provider(Box::new(provider));
            }
            "google" => {
                let provider = google::GoogleProvider::with_config(google::GoogleConfig {
                    api_key,
                    project_id: None
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
                let provider = comfyui::ComfyUIProvider::with_config(comfyui::ComfyUIConfig { api_url });
                self.register_provider(Box::new(provider));
            }
            "invokeai" => {
                let provider = invokeai::InvokeAIProvider::with_config(invokeai::InvokeAIConfig { api_url });
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

        provider.generate(request).await
    }
}
