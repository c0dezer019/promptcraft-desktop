use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Workflow {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    #[sqlx(rename = "type")]
    pub workflow_type: String,
    pub data: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorkflowInput {
    pub name: String,
    #[serde(rename = "type")]
    pub workflow_type: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateWorkflowInput {
    pub name: Option<String>,
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct WorkflowVersion {
    pub id: i64,
    pub workflow_id: String,
    pub version: i32,
    pub data: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Scene {
    pub id: String,
    pub workflow_id: String,
    pub name: String,
    pub data: String,
    pub thumbnail: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct CreateSceneInput {
    pub workflow_id: String,
    pub name: String,
    pub data: serde_json::Value,
    pub thumbnail: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSceneInput {
    pub name: Option<String>,
    pub data: Option<serde_json::Value>,
    pub thumbnail: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Job {
    pub id: String,
    pub workflow_id: String,
    pub scene_id: Option<String>,
    #[serde(rename = "type")]
    #[sqlx(rename = "type")]
    pub job_type: String,
    pub status: String,
    pub data: String,
    pub result: Option<String>,
    pub error: Option<String>,
    pub created_at: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct CreateJobInput {
    pub workflow_id: String,
    pub scene_id: Option<String>,
    #[serde(rename = "type")]
    pub job_type: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateJobInput {
    pub status: Option<String>,
    pub result: Option<serde_json::Value>,
    pub error: Option<String>,
}

/// Generate a UTC timestamp string
pub fn now() -> String {
    Utc::now().to_rfc3339()
}

/// Generate a UUID v4 string
pub fn generate_id() -> String {
    uuid::Uuid::new_v4().to_string()
}
