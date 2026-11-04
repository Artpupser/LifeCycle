use std::sync::Arc;

use s3::Bucket;
use sqlx::PgPool;

use super::{database, redis as redis_service, storage};
use crate::{config::Config, infrastructure::mail, shared::crypto::DataCipher};
use lettre::{AsyncSmtpTransport, Tokio1Executor};

#[derive(Clone)]
pub struct AppState {
    pub database: PgPool,
    pub redis: redis::Client,
    pub bucket: Arc<Bucket>,
    pub config: Arc<Config>,
    pub cipher: DataCipher,
    pub mailer: AsyncSmtpTransport<Tokio1Executor>,
}

impl AppState {
    pub fn lazy(config: &Config) -> Result<Self, &'static str> {
        let database = database::pool(config)?;
        let redis = redis_service::client(config)?;
        let bucket = storage::bucket(config)?;
        Ok(Self {
            database,
            redis,
            bucket,
            config: Arc::new(config.clone()),
            cipher: DataCipher::new(&config.data_encryption_key),
            mailer: mail::transport(config)?,
        })
    }

    pub async fn migrate(&self) -> Result<(), sqlx::migrate::MigrateError> {
        database::migrate(&self.database).await
    }
}
