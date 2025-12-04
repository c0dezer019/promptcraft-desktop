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

/// Google provider (Veo for video)
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
}

#[async_trait]
impl GenerationProvider for GoogleProvider {
    fn name(&self) -> &str {
        "google"
    }

    async fn is_available(&self) -> bool {
        self.config.is_some()
    }

    async fn generate(&self, _request: GenerationRequest) -> Result<GenerationResult> {
        // TODO: Implement Veo API integration when available
        Err(anyhow::anyhow!("Google Veo integration coming soon"))
    }

    fn config_schema(&self) -> serde_json::Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "api_key": {
                    "type": "string",
                    "title": "API Key",
                    "description": "Your Google AI API key"
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
