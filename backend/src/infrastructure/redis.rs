use crate::config::Config;

pub(super) fn client(config: &Config) -> Result<redis::Client, &'static str> {
    redis::Client::open(config.redis_url.as_str()).map_err(|_| "Redis configuration is invalid")
}
