use std::time::Duration;

use sqlx::{PgPool, postgres::PgPoolOptions};

use crate::config::Config;

pub(super) fn pool(config: &Config) -> Result<PgPool, &'static str> {
    PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(3))
        .connect_lazy(&config.database_url)
        .map_err(|_| "Database configuration is invalid")
}

pub(super) async fn migrate(pool: &PgPool) -> Result<(), sqlx::migrate::MigrateError> {
    sqlx::migrate!("./migrations").run(pool).await
}
