use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use super::super::{GenerationProvider, GenerationRequest, GenerationResult};

/// Grok configuration (xAI)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrokConfig {
    pub api_key: String,
}

/// Grok provider (xAI's Grok model)
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
}

#[async_trait]
impl GenerationProvider for GrokProvider {
    fn name(&self) -> &str {
        "grok"
    }

    async fn is_available(&self) -> bool {
        self.config.is_some()
    }

    async fn generate(&self, _request: GenerationRequest) -> Result<GenerationResult> {
        // TODO: Implement Grok/xAI API integration when available
        Err(anyhow::anyhow!("Grok integration coming soon"))
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
