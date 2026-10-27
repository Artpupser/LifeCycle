use base64::{Engine, engine::general_purpose::STANDARD};
use std::{collections::HashMap, net::SocketAddr};
use url::Url;

#[derive(Clone)]
pub struct Config {
    pub bind: SocketAddr,
    pub public_url: Url,
    pub database_url: String,
    pub redis_url: String,
    pub s3_endpoint: String,
    pub s3_bucket: String,
    pub s3_region: String,
    pub s3_access_key_id: String,
    pub s3_secret_access_key: String,
    pub auth_code_secret: String,
    pub data_encryption_key: [u8; 32],
    pub smtp_host: String,
    pub smtp_port: u16,
    pub smtp_tls: String,
    pub smtp_from: String,
    pub smtp_username: String,
    pub smtp_password: String,
    pub trust_proxy: bool,
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        Self::from_values(std::env::vars().collect())
    }

    pub fn from_values(values: HashMap<String, String>) -> Result<Self, String> {
        let get = |name: &str| {
            values
                .get(name)
                .filter(|value| !value.trim().is_empty())
                .cloned()
                .ok_or_else(|| format!("{name} is required"))
        };
        let bind = values
            .get("APP_BIND")
            .map(String::as_str)
            .unwrap_or("0.0.0.0:8080")
            .parse()
            .map_err(|_| "APP_BIND must be an IP address and port".to_owned())?;
        let public_url = validated_url(
            &get("APP_PUBLIC_URL")?,
            "APP_PUBLIC_URL",
            &["http", "https"],
        )?;
        if !public_url.username().is_empty()
            || public_url.password().is_some()
            || public_url.query().is_some()
            || public_url.fragment().is_some()
            || public_url.path() != "/"
        {
            return Err("APP_PUBLIC_URL must be an origin without credentials".to_owned());
        }
        let database_url = get("DATABASE_URL")?;
        validated_url(&database_url, "DATABASE_URL", &["postgres", "postgresql"])?;
        let redis_url = get("REDIS_URL")?;
        validated_url(&redis_url, "REDIS_URL", &["redis", "rediss"])?;
        redis::Client::open(redis_url.as_str()).map_err(|_| "REDIS_URL is invalid".to_owned())?;
        let s3_endpoint = get("S3_ENDPOINT")?;
        let endpoint = validated_url(&s3_endpoint, "S3_ENDPOINT", &["http", "https"])?;
        if !endpoint.username().is_empty()
            || endpoint.password().is_some()
            || endpoint.query().is_some()
            || endpoint.fragment().is_some()
            || endpoint.path() != "/"
        {
            return Err("S3_ENDPOINT must be an origin without credentials".to_owned());
        }
        let s3_bucket = get("S3_BUCKET")?;
        if !(3..=63).contains(&s3_bucket.len())
            || !s3_bucket
                .bytes()
                .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
            || !s3_bucket.as_bytes()[0].is_ascii_alphanumeric()
            || !s3_bucket.as_bytes()[s3_bucket.len() - 1].is_ascii_alphanumeric()
        {
            return Err("S3_BUCKET must be a valid DNS-compatible bucket name".to_owned());
        }
        let auth_code_secret = get("AUTH_CODE_SECRET")?;
        if auth_code_secret.len() < 32 {
            return Err("AUTH_CODE_SECRET must contain at least 32 bytes".to_owned());
        }
        let key = STANDARD
            .decode(get("DATA_ENCRYPTION_KEY")?)
            .map_err(|_| "DATA_ENCRYPTION_KEY must be base64".to_owned())?;
        let data_encryption_key: [u8; 32] = key
            .try_into()
            .map_err(|_| "DATA_ENCRYPTION_KEY must encode exactly 32 bytes".to_owned())?;
        let smtp_host = get("SMTP_HOST")?;
        let smtp_port = get("SMTP_PORT")?
            .parse::<u16>()
            .map_err(|_| "SMTP_PORT must be a port number".to_owned())?;
        if smtp_port == 0 {
            return Err("SMTP_PORT must not be zero".to_owned());
        }
        let smtp_tls = get("SMTP_TLS")?;
        if !["none", "tls", "starttls"].contains(&smtp_tls.as_str()) {
            return Err("SMTP_TLS must be none, tls or starttls".to_owned());
        }
        if smtp_tls == "none"
            && (public_url.scheme() == "https"
                || !["localhost", "127.0.0.1", "::1", "mailpit"].contains(&smtp_host.as_str()))
        {
            return Err("Unencrypted SMTP is allowed only in local HTTP development".to_owned());
        }
        let smtp_from = get("SMTP_FROM")?;
        smtp_from
            .parse::<lettre::message::Mailbox>()
            .map_err(|_| "SMTP_FROM must be a valid mailbox".to_owned())?;
        let smtp_username = values.get("SMTP_USERNAME").cloned().unwrap_or_default();
        let smtp_password = values.get("SMTP_PASSWORD").cloned().unwrap_or_default();
        if smtp_username.is_empty() != smtp_password.is_empty() {
            return Err("SMTP_USERNAME and SMTP_PASSWORD must be set together".to_owned());
        }
        let trust_proxy = match values
            .get("TRUST_PROXY")
            .map(String::as_str)
            .unwrap_or("false")
        {
            "true" => true,
            "false" => false,
            _ => return Err("TRUST_PROXY must be true or false".to_owned()),
        };
        Ok(Self {
            bind,
            public_url,
            database_url,
            redis_url,
            s3_endpoint,
            s3_bucket,
            s3_region: get("S3_REGION")?,
            s3_access_key_id: get("S3_ACCESS_KEY_ID")?,
            s3_secret_access_key: get("S3_SECRET_ACCESS_KEY")?,
            auth_code_secret,
            data_encryption_key,
            smtp_host,
            smtp_port,
            smtp_tls,
            smtp_from,
            smtp_username,
            smtp_password,
            trust_proxy,
        })
    }
}

fn validated_url(value: &str, name: &str, schemes: &[&str]) -> Result<Url, String> {
    let url = Url::parse(value).map_err(|_| format!("{name} is not a valid URL"))?;
    if !schemes.contains(&url.scheme()) || url.host_str().is_none() {
        return Err(format!("{name} has an unsupported scheme or missing host"));
    }
    Ok(url)
}
