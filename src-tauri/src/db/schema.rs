/// SQL schema for workflows table
pub const CREATE_WORKFLOWS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
"#;

/// SQL schema for workflow versions table (for history tracking)
pub const CREATE_WORKFLOW_VERSIONS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS workflow_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
)
"#;

/// SQL schema for scenes table (snapshots of workflow states)
pub const CREATE_SCENES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    thumbnail TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
)
"#;

/// SQL schema for jobs table (generation queue and status)
pub const CREATE_JOBS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    scene_id TEXT,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    data TEXT NOT NULL,
    result TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE SET NULL
)
"#;
