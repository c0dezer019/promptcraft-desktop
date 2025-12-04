use anyhow::Result;
use sqlx::sqlite::SqlitePool;
use std::path::PathBuf;

pub mod models;
pub mod operations;
pub mod schema;

#[derive(Clone)]
pub struct Database {
    pool: SqlitePool,
}

impl Database {
    /// Initialize database connection and run migrations
    pub async fn new(db_path: PathBuf) -> Result<Self> {
        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }

        // Use proper SQLite connection string with file:// protocol and create parameter
        let db_url = format!("sqlite://{}?mode=rwc", db_path.display());
        let pool = SqlitePool::connect(&db_url).await?;

        // Run migrations
        Self::run_migrations(&pool).await?;

        Ok(Self { pool })
    }

    /// Run database migrations
    async fn run_migrations(pool: &SqlitePool) -> Result<()> {
        sqlx::query(schema::CREATE_WORKFLOWS_TABLE)
            .execute(pool)
            .await?;

        sqlx::query(schema::CREATE_WORKFLOW_VERSIONS_TABLE)
            .execute(pool)
            .await?;

        sqlx::query(schema::CREATE_SCENES_TABLE)
            .execute(pool)
            .await?;

        sqlx::query(schema::CREATE_JOBS_TABLE)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }
}
