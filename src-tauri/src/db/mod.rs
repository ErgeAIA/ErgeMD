pub mod models;

use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::fs;
use std::path::PathBuf;
use std::str::FromStr;

const DB_DIR: &str = ".ergemd";
const DB_NAME: &str = "ergereader.db";

pub async fn init_db() -> Result<SqlitePool, Box<dyn std::error::Error>> {
    let db_path = get_db_path()?;

    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent)?;
    }

    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(
            SqliteConnectOptions::from_str(&db_url)?
                .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
                .busy_timeout(std::time::Duration::from_secs(5)),
        )
        .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS reading_progress (
            file_path TEXT PRIMARY KEY,
            scroll_percentage REAL NOT NULL DEFAULT 0,
            last_read_at INTEGER NOT NULL,
            word_count INTEGER NOT NULL DEFAULT 0
        )",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS recent_files (
            file_path TEXT PRIMARY KEY,
            file_name TEXT NOT NULL,
            opened_at INTEGER NOT NULL
        )",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS workspaces (
            folder_path TEXT PRIMARY KEY,
            folder_name TEXT NOT NULL,
            opened_at INTEGER NOT NULL
        )",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS schema_version (
            key TEXT PRIMARY KEY DEFAULT 'current',
            version INTEGER NOT NULL
        )",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "INSERT INTO schema_version (key, version) VALUES ('current', 1) ON CONFLICT(key) DO NOTHING",
    )
    .execute(&pool)
    .await?;

    Ok(pool)
}

pub fn get_db_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let home = dirs::home_dir().ok_or("Cannot determine home directory")?;
    Ok(home.join(DB_DIR).join(DB_NAME))
}
