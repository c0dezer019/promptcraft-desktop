use anyhow::Result;
use sqlx::SqlitePool;
use std::sync::Arc;
use tokio::sync::RwLock;

use super::{GenerationRequest, GenerationService};
use crate::db::{models::*, operations::{JobOps, SceneOps}};

/// Job processor that consumes jobs from the database queue
pub struct JobProcessor {
    db_pool: SqlitePool,
    generation_service: Arc<RwLock<GenerationService>>,
    is_running: Arc<RwLock<bool>>,
}

impl JobProcessor {
    pub fn new(db_pool: SqlitePool, generation_service: Arc<RwLock<GenerationService>>) -> Self {
        Self {
            db_pool,
            generation_service,
            is_running: Arc::new(RwLock::new(false)),
        }
    }

    /// Start the job processor
    pub async fn start(&self) {
        let mut is_running = self.is_running.write().await;
        if *is_running {
            return;
        }
        *is_running = true;
        drop(is_running);

        let db_pool = self.db_pool.clone();
        let service = self.generation_service.clone();
        let is_running = self.is_running.clone();

        tokio::spawn(async move {
            while *is_running.read().await {
                if let Err(e) = Self::process_pending_jobs(&db_pool, &service).await {
                    eprintln!("Error processing jobs: {}", e);
                }
                tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
            }
        });
    }

    /// Stop the job processor
    #[allow(dead_code)]
    pub async fn stop(&self) {
        let mut is_running = self.is_running.write().await;
        *is_running = false;
    }

    /// Process all pending jobs
    async fn process_pending_jobs(
        pool: &SqlitePool,
        service: &Arc<RwLock<GenerationService>>,
    ) -> Result<()> {
        // Get all pending jobs
        let pending_jobs: Vec<Job> = sqlx::query_as(
            "SELECT * FROM jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 10",
        )
        .fetch_all(pool)
        .await?;

        for job in pending_jobs {
            if let Err(e) = Self::process_job(pool, service, &job).await {
                eprintln!("Error processing job {}: {}", job.id, e);

                // Mark job as failed
                let _ = JobOps::update(
                    pool,
                    &job.id,
                    UpdateJobInput {
                        status: Some("failed".to_string()),
                        result: None,
                        error: Some(e.to_string()),
                    },
                )
                .await;
            }
        }

        Ok(())
    }

    /// Process a single job
    async fn process_job(
        pool: &SqlitePool,
        service: &Arc<RwLock<GenerationService>>,
        job: &Job,
    ) -> Result<()> {
        // Mark job as running
        JobOps::update(
            pool,
            &job.id,
            UpdateJobInput {
                status: Some("running".to_string()),
                result: None,
                error: None,
            },
        )
        .await?;

        // Parse job data
        let job_data: serde_json::Value = serde_json::from_str(&job.data)?;

        let provider = job_data
            .get("provider")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing provider in job data"))?;

        let prompt = job_data
            .get("prompt")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing prompt in job data"))?;

        let model = job_data
            .get("model")
            .and_then(|v| v.as_str())
            .unwrap_or("default");

        let parameters = job_data
            .get("parameters")
            .cloned()
            .unwrap_or(serde_json::json!({}));

        let request = GenerationRequest {
            prompt: prompt.to_string(),
            model: model.to_string(),
            parameters,
        };

        // Execute generation
        let service_lock = service.read().await;
        let result = service_lock.generate(provider, request).await?;
        drop(service_lock);

        // Mark job as completed
        JobOps::update(
            pool,
            &job.id,
            UpdateJobInput {
                status: Some("completed".to_string()),
                result: Some(serde_json::to_value(&result)?),
                error: None,
            },
        )
        .await?;

        // Update scene thumbnail if job is linked to a scene
        if let Some(scene_id) = &job.scene_id {
            if let Some(thumbnail_url) = result.output_url.or(result.output_data) {
                eprintln!("[JobProcessor] Updating scene {} thumbnail with: {}", scene_id, thumbnail_url);

                match SceneOps::update(
                    pool,
                    scene_id,
                    UpdateSceneInput {
                        name: None,
                        data: None,
                        thumbnail: Some(thumbnail_url.clone()),
                    },
                )
                .await
                {
                    Ok(_) => eprintln!("[JobProcessor] Scene thumbnail updated successfully"),
                    Err(e) => eprintln!("[JobProcessor] Warning: Failed to update scene thumbnail: {}", e),
                }
            }
        }

        Ok(())
    }
}
