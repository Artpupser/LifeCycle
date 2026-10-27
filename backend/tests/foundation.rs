use std::collections::HashMap;

use axum::{
    body::{Body, to_bytes},
    http::{Request, StatusCode},
};
use lifecycle_api::{config::Config, router, state::AppState};
use serde_json::{Value, json};
use tower::ServiceExt;

fn values() -> HashMap<String, String> {
    [
        (
            "DATABASE_URL",
            "postgres://test:secret@127.0.0.1:1/lifecycle",
        ),
        ("REDIS_URL", "redis://:secret@127.0.0.1:1"),
        ("S3_ENDPOINT", "http://127.0.0.1:1"),
        ("S3_BUCKET", "lifecycle"),
        ("S3_REGION", "garage"),
        ("S3_ACCESS_KEY_ID", "test-key"),
        ("S3_SECRET_ACCESS_KEY", "test-secret"),
        ("APP_PUBLIC_URL", "http://localhost:8081"),
        (
            "AUTH_CODE_SECRET",
            "test-secret-pepper-at-least-32-bytes-long",
        ),
        (
            "DATA_ENCRYPTION_KEY",
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        ),
        ("SMTP_HOST", "127.0.0.1"),
        ("SMTP_PORT", "1025"),
        ("SMTP_TLS", "none"),
        ("SMTP_FROM", "noreply@localhost"),
    ]
    .into_iter()
    .map(|(k, v)| (k.to_owned(), v.to_owned()))
    .collect()
}

#[test]
fn configuration_errors_do_not_expose_secrets() {
    let mut input = values();
    input.insert("DATABASE_URL".into(), "invalid-secret-url".into());
    let error = Config::from_values(input).err().unwrap();
    assert!(error.contains("DATABASE_URL"));
    assert!(!error.contains("invalid-secret-url"));
}

#[test]
fn configuration_rejects_unsafe_storage_endpoint() {
    let mut input = values();
    input.insert(
        "S3_ENDPOINT".into(),
        "http://user:secret@localhost:3900/path".into(),
    );
    assert!(Config::from_values(input).is_err());
}

#[test]
fn configuration_requires_real_storage_credentials() {
    let mut input = values();
    input.remove("S3_SECRET_ACCESS_KEY");
    assert!(Config::from_values(input).is_err());
}

#[tokio::test]
async fn liveness_is_independent_of_infrastructure_and_has_safe_headers() {
    let state = AppState::lazy(&Config::from_values(values()).unwrap()).unwrap();
    let response = router(state)
        .oneshot(
            Request::builder()
                .uri("/api/health/live")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.headers()["cache-control"], "no-store");
    assert_eq!(response.headers()["x-content-type-options"], "nosniff");
    let body: Value =
        serde_json::from_slice(&to_bytes(response.into_body(), 4096).await.unwrap()).unwrap();
    assert_eq!(body, json!({"status":"ok"}));
}

#[tokio::test]
async fn readiness_reports_actual_connection_failures_without_credentials() {
    let state = AppState::lazy(&Config::from_values(values()).unwrap()).unwrap();
    let response = router(state)
        .oneshot(
            Request::builder()
                .uri("/api/health/ready")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    let body: Value =
        serde_json::from_slice(&to_bytes(response.into_body(), 4096).await.unwrap()).unwrap();
    assert_eq!(
        body,
        json!({"status":"unavailable","checks":{"postgres":"unavailable","redis":"unavailable","garage":"unavailable"}})
    );
}

#[tokio::test]
async fn mutation_without_origin_is_rejected_before_services_are_accessed() {
    let state = AppState::lazy(&Config::from_values(values()).unwrap()).unwrap();
    let response = router(state)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/logout")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
    let body: Value =
        serde_json::from_slice(&to_bytes(response.into_body(), 4096).await.unwrap()).unwrap();
    assert_eq!(body["error"]["code"], "csrf_failed");
}

#[tokio::test]
async fn csrf_origin_includes_the_public_port_and_accepts_exact_origin() {
    let state = AppState::lazy(&Config::from_values(values()).unwrap()).unwrap();
    for origin in [
        "http://localhost",
        "http://localhost:8082",
        "https://evil.example",
    ] {
        let response = router(state.clone())
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/auth/logout")
                    .header("Origin", origin)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }
    let response = router(state)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/logout")
                .header("Origin", "http://localhost:8081")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NO_CONTENT);
}
