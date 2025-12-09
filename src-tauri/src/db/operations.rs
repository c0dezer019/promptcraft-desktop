use anyhow::Result;
use sqlx::SqlitePool;

use super::models::*;

/// Workflow CRUD operations
pub struct WorkflowOps;

impl WorkflowOps {
    pub async fn create(pool: &SqlitePool, input: CreateWorkflowInput) -> Result<Workflow> {
        let id = generate_id();
        let now = now();
        let data = serde_json::to_string(&input.data)?;

        let workflow = sqlx::query_as::<_, Workflow>(
            r#"
            INSERT INTO workflows (id, name, type, data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            RETURNING *
            "#,
        )
        .bind(&id)
        .bind(&input.name)
        .bind(&input.workflow_type)
        .bind(&data)
        .bind(&now)
        .bind(&now)
        .fetch_one(pool)
        .await?;

        Ok(workflow)
    }

    pub async fn get(pool: &SqlitePool, id: &str) -> Result<Option<Workflow>> {
        let workflow = sqlx::query_as::<_, Workflow>("SELECT * FROM workflows WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await?;

        Ok(workflow)
    }

    pub async fn list(pool: &SqlitePool) -> Result<Vec<Workflow>> {
        let workflows =
            sqlx::query_as::<_, Workflow>("SELECT * FROM workflows ORDER BY updated_at DESC")
                .fetch_all(pool)
                .await?;

        Ok(workflows)
    }

    pub async fn update(
        pool: &SqlitePool,
        id: &str,
        input: UpdateWorkflowInput,
    ) -> Result<Workflow> {
        let now = now();

        if let Some(name) = input.name {
            sqlx::query("UPDATE workflows SET name = ?, updated_at = ? WHERE id = ?")
                .bind(&name)
                .bind(&now)
                .bind(id)
                .execute(pool)
                .await?;
        }

        if let Some(data) = input.data {
            let data_str = serde_json::to_string(&data)?;
            sqlx::query("UPDATE workflows SET data = ?, updated_at = ? WHERE id = ?")
                .bind(&data_str)
                .bind(&now)
                .bind(id)
                .execute(pool)
                .await?;
        }

        let workflow = Self::get(pool, id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Workflow not found"))?;

        Ok(workflow)
    }

    pub async fn delete(pool: &SqlitePool, id: &str) -> Result<()> {
        sqlx::query("DELETE FROM workflows WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }
}

/// Scene CRUD operations
pub struct SceneOps;

impl SceneOps {
    pub async fn create(pool: &SqlitePool, input: CreateSceneInput) -> Result<Scene> {
        let id = generate_id();
        let now = now();
        let data = serde_json::to_string(&input.data)?;

        let scene = sqlx::query_as::<_, Scene>(
            r#"
            INSERT INTO scenes (id, workflow_id, name, data, thumbnail, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            RETURNING *
            "#,
        )
        .bind(&id)
        .bind(&input.workflow_id)
        .bind(&input.name)
        .bind(&data)
        .bind(&input.thumbnail)
        .bind(&now)
        .fetch_one(pool)
        .await?;

        Ok(scene)
    }

    pub async fn list_by_workflow(pool: &SqlitePool, workflow_id: &str) -> Result<Vec<Scene>> {
        let scenes = sqlx::query_as::<_, Scene>(
            "SELECT * FROM scenes WHERE workflow_id = ? ORDER BY created_at DESC",
        )
        .bind(workflow_id)
        .fetch_all(pool)
        .await?;

        Ok(scenes)
    }

    pub async fn delete(pool: &SqlitePool, id: &str) -> Result<()> {
        sqlx::query("DELETE FROM scenes WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }
}

/// Job CRUD operations
pub struct JobOps;

impl JobOps {
    pub async fn create(pool: &SqlitePool, input: CreateJobInput) -> Result<Job> {
        let id = generate_id();
        let now = now();
        let data = serde_json::to_string(&input.data)?;

        let job = sqlx::query_as::<_, Job>(
            r#"
            INSERT INTO jobs (id, workflow_id, scene_id, type, status, data, created_at)
            VALUES (?, ?, ?, ?, 'pending', ?, ?)
            RETURNING *
            "#,
        )
        .bind(&id)
        .bind(&input.workflow_id)
        .bind(&input.scene_id)
        .bind(&input.job_type)
        .bind(&data)
        .bind(&now)
        .fetch_one(pool)
        .await?;

        Ok(job)
    }

    pub async fn get(pool: &SqlitePool, id: &str) -> Result<Option<Job>> {
        let job = sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await?;

        Ok(job)
    }

    pub async fn list_by_workflow(pool: &SqlitePool, workflow_id: &str) -> Result<Vec<Job>> {
        let jobs = sqlx::query_as::<_, Job>(
            "SELECT * FROM jobs WHERE workflow_id = ? ORDER BY created_at DESC",
        )
        .bind(workflow_id)
        .fetch_all(pool)
        .await?;

        Ok(jobs)
    }

    pub async fn update(pool: &SqlitePool, id: &str, input: UpdateJobInput) -> Result<Job> {
        let now = now();

        if let Some(status) = &input.status {
            let started_at = if status == "running" {
                Some(now.clone())
            } else {
                None
            };
            let completed_at = if status == "completed" || status == "failed" {
                Some(now.clone())
            } else {
                None
            };

            sqlx::query(
                "UPDATE jobs SET status = ?, started_at = COALESCE(started_at, ?), completed_at = ? WHERE id = ?",
            )
            .bind(status)
            .bind(&started_at)
            .bind(&completed_at)
            .bind(id)
            .execute(pool)
            .await?;
        }

        if let Some(result) = &input.result {
            let result_str = serde_json::to_string(result)?;
            sqlx::query("UPDATE jobs SET result = ? WHERE id = ?")
                .bind(&result_str)
                .bind(id)
                .execute(pool)
                .await?;
        }

        if let Some(error) = &input.error {
            sqlx::query("UPDATE jobs SET error = ? WHERE id = ?")
                .bind(error)
                .bind(id)
                .execute(pool)
                .await?;
        }

        let job = Self::get(pool, id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Job not found"))?;

        Ok(job)
    }
}

/// Workflow version operations
pub struct VersionOps;

impl VersionOps {
    pub async fn create(
        pool: &SqlitePool,
        workflow_id: &str,
        data: serde_json::Value,
    ) -> Result<WorkflowVersion> {
        let now = now();
        let data_str = serde_json::to_string(&data)?;

        // Get the next version number
        let version: i32 = sqlx::query_scalar(
            "SELECT COALESCE(MAX(version), 0) + 1 FROM workflow_versions WHERE workflow_id = ?",
        )
        .bind(workflow_id)
        .fetch_one(pool)
        .await?;

        let workflow_version = sqlx::query_as::<_, WorkflowVersion>(
            r#"
            INSERT INTO workflow_versions (workflow_id, version, data, created_at)
            VALUES (?, ?, ?, ?)
            RETURNING *
            "#,
        )
        .bind(workflow_id)
        .bind(version)
        .bind(&data_str)
        .bind(&now)
        .fetch_one(pool)
        .await?;

        Ok(workflow_version)
    }

    pub async fn list_by_workflow(
        pool: &SqlitePool,
        workflow_id: &str,
    ) -> Result<Vec<WorkflowVersion>> {
        let versions = sqlx::query_as::<_, WorkflowVersion>(
            "SELECT * FROM workflow_versions WHERE workflow_id = ? ORDER BY version DESC",
        )
        .bind(workflow_id)
        .fetch_all(pool)
        .await?;

        Ok(versions)
    }
}
