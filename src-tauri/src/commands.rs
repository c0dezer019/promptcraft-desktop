use crate::db::{models::*, operations::*, Database};
use crate::generation::GenerationService;
use std::net::{TcpStream, ToSocketAddrs};
use std::sync::Arc;
use std::time::Duration;
use tauri::State;
use tokio::sync::RwLock;

/// Workflow Commands
#[tauri::command]
pub async fn create_workflow(
    db: State<'_, Database>,
    input: CreateWorkflowInput,
) -> Result<Workflow, String> {
    WorkflowOps::create(db.pool(), input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_workflow(db: State<'_, Database>, id: String) -> Result<Option<Workflow>, String> {
    WorkflowOps::get(db.pool(), &id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_workflows(db: State<'_, Database>) -> Result<Vec<Workflow>, String> {
    WorkflowOps::list(db.pool())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_workflow(
    db: State<'_, Database>,
    id: String,
    input: UpdateWorkflowInput,
) -> Result<Workflow, String> {
    WorkflowOps::update(db.pool(), &id, input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_workflow(db: State<'_, Database>, id: String) -> Result<(), String> {
    WorkflowOps::delete(db.pool(), &id)
        .await
        .map_err(|e| e.to_string())
}

/// Scene Commands
#[tauri::command]
pub async fn create_scene(
    db: State<'_, Database>,
    input: CreateSceneInput,
) -> Result<Scene, String> {
    SceneOps::create(db.pool(), input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_scenes(
    db: State<'_, Database>,
    workflow_id: String,
) -> Result<Vec<Scene>, String> {
    SceneOps::list_by_workflow(db.pool(), &workflow_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_scene(db: State<'_, Database>, id: String) -> Result<(), String> {
    SceneOps::delete(db.pool(), &id)
        .await
        .map_err(|e| e.to_string())
}

/// Job Commands
#[tauri::command]
pub async fn create_job(db: State<'_, Database>, input: CreateJobInput) -> Result<Job, String> {
    JobOps::create(db.pool(), input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_job(db: State<'_, Database>, id: String) -> Result<Option<Job>, String> {
    JobOps::get(db.pool(), &id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_jobs(db: State<'_, Database>, workflow_id: String) -> Result<Vec<Job>, String> {
    JobOps::list_by_workflow(db.pool(), &workflow_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_job(
    db: State<'_, Database>,
    id: String,
    input: UpdateJobInput,
) -> Result<Job, String> {
    JobOps::update(db.pool(), &id, input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_job(db: State<'_, Database>, job_id: String) -> Result<(), String> {
    JobOps::delete(db.pool(), &job_id)
        .await
        .map_err(|e| e.to_string())
}

/// Version Commands
#[tauri::command]
pub async fn create_version(
    db: State<'_, Database>,
    workflow_id: String,
    data: serde_json::Value,
) -> Result<WorkflowVersion, String> {
    VersionOps::create(db.pool(), &workflow_id, data)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_versions(
    db: State<'_, Database>,
    workflow_id: String,
) -> Result<Vec<WorkflowVersion>, String> {
    VersionOps::list_by_workflow(db.pool(), &workflow_id)
        .await
        .map_err(|e| e.to_string())
}

/// Generation Commands
#[tauri::command]
pub async fn submit_generation(
    db: State<'_, Database>,
    workflow_id: String,
    provider: String,
    prompt: String,
    model: String,
    parameters: serde_json::Value,
) -> Result<Job, String> {
    let job_data = serde_json::json!({
        "provider": provider,
        "prompt": prompt,
        "model": model,
        "parameters": parameters,
    });

    JobOps::create(
        db.pool(),
        CreateJobInput {
            workflow_id,
            scene_id: None,
            job_type: "generation".to_string(),
            data: job_data,
        },
    )
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn configure_provider(
    service: State<'_, Arc<RwLock<GenerationService>>>,
    provider: String,
    api_key: String,
) -> Result<(), String> {
    let mut service = service.write().await;
    service
        .configure_provider(&provider, api_key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_providers(
    service: State<'_, Arc<RwLock<GenerationService>>>,
) -> Result<Vec<String>, String> {
    let service = service.read().await;
    Ok(service.list_providers())
}

#[tauri::command]
pub async fn configure_local_provider(
    service: State<'_, Arc<RwLock<GenerationService>>>,
    provider: String,
    api_url: String,
) -> Result<(), String> {
    let mut service = service.write().await;
    service
        .configure_local_provider(&provider, api_url)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn check_port(address: String) -> bool {
    let timeout = Duration::from_secs(1);

    if let Ok(iter) = address.to_socket_addrs() {
        for addr in iter {
            if TcpStream::connect_timeout(&addr, timeout).is_ok() {
                return true;
            }
        }
    }

    false
}

/// Call AI for text generation (used by enhance feature)
#[tauri::command]
pub async fn call_ai(
    service: State<'_, Arc<RwLock<GenerationService>>>,
    provider: String,
    model: String,
    prompt: String,
    max_tokens: Option<u32>,
    temperature: Option<f64>,
) -> Result<String, String> {
    use crate::generation::GenerationRequest;

    let service = service.read().await;

    let params = serde_json::json!({
        "max_tokens": max_tokens.unwrap_or(4096),
        "temperature": temperature.unwrap_or(1.0),
    });

    let request = GenerationRequest {
        prompt,
        model,
        parameters: params,
    };

    let result = service
        .generate(&provider, request)
        .await
        .map_err(|e| e.to_string())?;

    // For text generation, the result is in output_data
    result
        .output_data
        .ok_or_else(|| "No text output received".to_string())
}
