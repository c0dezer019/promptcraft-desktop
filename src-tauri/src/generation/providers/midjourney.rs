use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use super::super::{GenerationProvider, GenerationRequest, GenerationResult};

/// Midjourney configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MidjourneyConfig {
    pub api_key: String,
}

/// Midjourney provider (via unofficial API or Discord bot)
pub struct MidjourneyProvider {
    config: Option<MidjourneyConfig>,
    client: reqwest::Client,
}

impl MidjourneyProvider {
    pub fn new() -> Self {
        Self {
            config: None,
            client: reqwest::Client::new(),
        }
    }

    pub fn with_config(config: MidjourneyConfig) -> Self {
        Self {
            config: Some(config),
            client: reqwest::Client::new(),
        }
    }
}

#[async_trait]
impl GenerationProvider for MidjourneyProvider {
    fn name(&self) -> &str {
        "midjourney"
    }

    async fn is_available(&self) -> bool {
        self.config.is_some()
    }

    async fn generate(&self, _request: GenerationRequest) -> Result<GenerationResult> {
        // TODO: Implement Midjourney API integration
        // Note: Midjourney doesn't have official API yet, would need to use
        // unofficial APIs like midjourney-api or goapi.ai
        Err(anyhow::anyhow!("Midjourney integration coming soon"))
    }

    fn config_schema(&self) -> serde_json::Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "api_key": {
                    "type": "string",
                    "title": "API Key",
                    "description": "Your Midjourney API key (from third-party service)"
                }
            },
            "required": ["api_key"]
        })
    }
}
