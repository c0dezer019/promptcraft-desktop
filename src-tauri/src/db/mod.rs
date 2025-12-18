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
        println!("[Database] Initializing database at: {:?}", db_path);
        use std::io::Write;
        let _ = std::io::stdout().flush();

        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            tokio::fs::create_dir_all(parent).await?;
            println!("[Database] Ensured parent directory exists: {:?}", parent);
            let _ = std::io::stdout().flush();
        }

        // Use proper SQLite connection string with file:// protocol and create parameter
        let db_url = format!("sqlite:{}?mode=rwc", db_path.display());
        println!("[Database] Connecting to: {}", db_url);
        let _ = std::io::stdout().flush();

        let pool = SqlitePool::connect(&db_url).await?;
        println!("[Database] Connection established, pool size: {:?}", pool.size());
        let _ = std::io::stdout().flush();

        // Test basic write capability
        println!("[Database] Testing basic database write...");
        let _ = std::io::stdout().flush();

        sqlx::query("CREATE TABLE IF NOT EXISTS _test (id INTEGER PRIMARY KEY)")
            .execute(&pool)
            .await?;

        println!("[Database] Test table created successfully");
        let _ = std::io::stdout().flush();

        // Enable WAL mode for better concurrency
        sqlx::query("PRAGMA journal_mode = WAL;")
            .execute(&pool)
            .await?;
        println!("[Database] WAL mode enabled");
        let _ = std::io::stdout().flush();

        // Run migrations
        Self::run_migrations(&pool).await?;

        println!("[Database] Database initialization complete at: {:?}", db_path);
        let _ = std::io::stdout().flush();

        Ok(Self { pool })
    }

    /// Run database migrations
    async fn run_migrations(pool: &SqlitePool) -> Result<()> {
        eprintln!("[Database] Running migrations...");

        eprintln!("[Database] Creating workflows table...");
        sqlx::query(schema::CREATE_WORKFLOWS_TABLE)
            .execute(pool)
            .await?;

        eprintln!("[Database] Creating workflow_versions table...");
        sqlx::query(schema::CREATE_WORKFLOW_VERSIONS_TABLE)
            .execute(pool)
            .await?;

        eprintln!("[Database] Creating scenes table...");
        sqlx::query(schema::CREATE_SCENES_TABLE)
            .execute(pool)
            .await?;

        eprintln!("[Database] Creating jobs table...");
        sqlx::query(schema::CREATE_JOBS_TABLE).execute(pool).await?;

        eprintln!("[Database] All migrations completed successfully!");

        // Verify tables were created
        let tables: Vec<(String,)> = sqlx::query_as(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        .fetch_all(pool)
        .await?;

        eprintln!("[Database] Tables in database: {:?}", tables.iter().map(|(name,)| name).collect::<Vec<_>>());

        Ok(())
    }

    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }
}
