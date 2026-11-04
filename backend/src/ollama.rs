use crate::ai_provider::{self, Answer};
use serde_json::{Value, json};
pub fn endpoint(value: &str) -> Result<String, &'static str> {
    let url = reqwest::Url::parse(value).map_err(|_| "ai_invalid_endpoint")?;
    let host = url.host_str().ok_or("ai_invalid_endpoint")?;
    let local = matches!(
        host,
        "localhost" | "ollama" | "host.docker.internal" | "host.containers.internal"
    ) || host
        .trim_matches(['[', ']'])
        .parse::<std::net::IpAddr>()
        .is_ok_and(|ip| match ip {
            std::net::IpAddr::V4(ip) => ip.is_loopback() || ip.is_private(),
            std::net::IpAddr::V6(ip) => ip.is_loopback() || ip.is_unique_local(),
        });
    if !local
        || !matches!(url.scheme(), "http" | "https")
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
        || url.path() != "/"
    {
        return Err("ai_invalid_endpoint");
    }
    Ok(url.to_string().trim_end_matches('/').to_owned())
}
pub fn client(seconds: u64) -> Result<reqwest::Client, &'static str> {
    reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .connect_timeout(std::time::Duration::from_secs(5))
        .timeout(std::time::Duration::from_secs(seconds))
        .build()
        .map_err(|_| "ai_unavailable")
}
pub async fn generate(base: &str, body: &Value) -> Result<Answer, &'static str> {
    let base = endpoint(base)?;
    let response = client(90)?
        .post(format!("{base}/api/chat"))
        .json(body)
        .send()
        .await
        .map_err(|_| "ai_unavailable")?;
    if !response.status().is_success() {
        return Err("ai_unavailable");
    }
    let value = ai_provider::bounded_json_limit(response, 1024 * 1024).await?;
    if value["done"] != true {
        return Err("ai_incomplete");
    }
    let text = value["message"]["content"]
        .as_str()
        .filter(|s| !s.trim().is_empty())
        .ok_or("ai_invalid_response")?
        .to_owned();
    Ok(Answer {
        text,
        usage: json!({"input_tokens":value["prompt_eval_count"],"output_tokens":value["eval_count"]}),
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn endpoint_is_an_explicit_local_service() {
        for url in [
            "http://127.0.0.1:11434",
            "http://ollama:11434",
            "http://192.168.1.2:11434",
            "http://[::1]:11434",
        ] {
            assert!(endpoint(url).is_ok());
        }
        for url in [
            "https://evil.example",
            "http://169.254.169.254",
            "file:///tmp/a",
            "http://user:password@localhost:11434",
            "http://localhost:11434/proxy?q=x",
        ] {
            assert!(endpoint(url).is_err());
        }
    }
}
