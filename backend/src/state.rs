use std::{sync::Arc, time::Duration};

use s3::{Bucket, creds::Credentials, region::Region};
use sqlx::{PgPool, postgres::PgPoolOptions};

use crate::{config::Config, crypto::DataCipher, mail};
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
        let database = PgPoolOptions::new()
            .max_connections(10)
            .acquire_timeout(Duration::from_secs(3))
            .connect_lazy(&config.database_url)
            .map_err(|_| "Database configuration is invalid")?;
        let redis = redis::Client::open(config.redis_url.as_str())
            .map_err(|_| "Redis configuration is invalid")?;
        let credentials = Credentials::new(
            Some(&config.s3_access_key_id),
            Some(&config.s3_secret_access_key),
            None,
            None,
            None,
        )
        .map_err(|_| "S3 credentials configuration is invalid")?;
        let bucket = Bucket::new(
            &config.s3_bucket,
            Region::Custom {
                region: config.s3_region.clone(),
                endpoint: config.s3_endpoint.clone(),
            },
            credentials,
        )
        .map_err(|_| "S3 bucket configuration is invalid")?
        .with_path_style();
        Ok(Self {
            database,
            redis,
            bucket: Arc::from(bucket),
            config: Arc::new(config.clone()),
            cipher: DataCipher::new(&config.data_encryption_key),
            mailer: mail::transport(config)?,
        })
    }

    pub async fn migrate(&self) -> Result<(), sqlx::migrate::MigrateError> {
        sqlx::migrate!("./migrations").run(&self.database).await
    }
}
