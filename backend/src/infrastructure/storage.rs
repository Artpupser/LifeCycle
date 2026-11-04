use std::sync::Arc;

use s3::{Bucket, creds::Credentials, region::Region};

use crate::config::Config;

pub(super) fn bucket(config: &Config) -> Result<Arc<Bucket>, &'static str> {
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
    Ok(Arc::from(bucket))
}
