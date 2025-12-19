mod commands;
mod db;
mod generation;

use std::sync::Arc;
use tauri::Manager;
use tokio::sync::RwLock;

use generation::providers::{
    anthropic::AnthropicProvider, google::GoogleProvider, grok::GrokProvider,
    openai::OpenAIProvider,
};
use generation::{processor::JobProcessor, GenerationService};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            // Initialize database and generation service synchronously in setup
            let app_handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                eprintln!("[Setup] Starting database initialization...");
                // Initialize database
                let db = match init_database(&app_handle).await {
                    Ok(db) => {
                        eprintln!("[Setup] Database initialized successfully");
                        db
                    },
                    Err(e) => {
                        eprintln!("[Setup] FAILED to initialize database: {}", e);
                        eprintln!("[Setup] Error details: {:?}", e);
                        panic!("Cannot continue without database: {}", e);
                    }
                };

                // Initialize generation service
                let generation_service = init_generation_service();
                let service_arc = Arc::new(RwLock::new(generation_service));

                // Initialize and start job processor
                let processor = JobProcessor::new(db.pool().clone(), service_arc.clone());
                processor.start().await;

                // Store services in app state
                app_handle.manage(service_arc);
                app_handle.manage(processor);
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_workflow,
            commands::get_workflow,
            commands::list_workflows,
            commands::update_workflow,
            commands::delete_workflow,
            commands::create_scene,
            commands::list_scenes,
            commands::list_all_scenes,
            commands::delete_scene,
            commands::create_job,
            commands::get_job,
            commands::list_jobs,
            commands::update_job,
            commands::delete_job,
            commands::create_version,
            commands::list_versions,
            commands::submit_generation,
            commands::configure_provider,
            commands::list_providers,
            commands::configure_local_provider,
            commands::check_port,
            commands::call_ai,
            commands::open_in_default_app,
            commands::open_with_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn init_database(app: &tauri::AppHandle) -> anyhow::Result<db::Database> {
    eprintln!("[init_database] Function called");
    // Check for snap environment first, fallback to home directory
    let app_data_dir = if let Ok(snap_user_common) = std::env::var("SNAP_USER_COMMON") {
        // Use snap's unversioned user data directory (persists across updates)
        eprintln!("Running in snap environment, using SNAP_USER_COMMON");
        std::path::PathBuf::from(snap_user_common).join("promptcraft")
    } else if let Ok(snap_user_data) = std::env::var("SNAP_USER_DATA") {
        // Use snap's versioned user data directory
        eprintln!("Running in snap environment, using SNAP_USER_DATA");
        std::path::PathBuf::from(snap_user_data).join("promptcraft")
    } else {
        // Fallback for non-snap environments - use home directory
        eprintln!("Not in snap environment, using home directory");
        let home = std::env::var("HOME")
            .map(std::path::PathBuf::from)
            .unwrap_or_else(|_| std::path::PathBuf::from("/tmp"));
        home.join(".promptcraft")
    };

    std::fs::create_dir_all(&app_data_dir)?;
    eprintln!("Using database directory: {:?}", app_data_dir);

    // Create database path
    let db_path = app_data_dir.join("promptcraft.db");
    eprintln!("Database path: {:?}", db_path);

    // Initialize database
    let database = db::Database::new(db_path).await?;

    // Store database in app state
    app.manage(database.clone());

    Ok(database)
}

fn init_generation_service() -> GenerationService {
    let mut service = GenerationService::new();

    // Register providers (they'll check for API keys at runtime)
    service.register_provider(Box::new(AnthropicProvider::new()));
    service.register_provider(Box::new(OpenAIProvider::new()));
    service.register_provider(Box::new(GoogleProvider::new()));
    service.register_provider(Box::new(GrokProvider::new()));

    service
}
