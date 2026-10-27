use std::{future::Future, time::Duration};

use axum::{Json, extract::State, http::StatusCode};
use serde::Serialize;

use crate::state::AppState;

#[derive(Serialize)]
pub struct LiveResponse {
    status: &'static str,
}

#[derive(Serialize)]
pub struct ReadyResponse {
    status: &'static str,
    checks: Checks,
}

#[derive(Serialize)]
struct Checks {
    postgres: &'static str,
    redis: &'static str,
    garage: &'static str,
}

pub async fn live() -> Json<LiveResponse> {
    Json(LiveResponse { status: "ok" })
}

pub async fn ready(State(state): State<AppState>) -> (StatusCode, Json<ReadyResponse>) {
    let postgres = bounded(async {
        sqlx::query_scalar::<_, i32>("SELECT 1")
            .fetch_one(&state.database)
            .await
            .is_ok_and(|result| result == 1)
    });
    let redis = bounded(async {
        let Ok(mut connection) = state.redis.get_multiplexed_async_connection().await else {
            return false;
        };
        redis::cmd("PING")
            .query_async::<String>(&mut connection)
            .await
            .is_ok_and(|result| result == "PONG")
    });
    let garage = bounded(async {
        state
            .bucket
            .list_page(String::new(), None, None, None, Some(1))
            .await
            .is_ok_and(|(_, code)| code == 200)
    });
    let (postgres, redis, garage) = tokio::join!(postgres, redis, garage);
    let available = postgres && redis && garage;
    (
        if available {
            StatusCode::OK
        } else {
            StatusCode::SERVICE_UNAVAILABLE
        },
        Json(ReadyResponse {
            status: if available { "ready" } else { "unavailable" },
            checks: Checks {
                postgres: check_status(postgres),
                redis: check_status(redis),
                garage: check_status(garage),
            },
        }),
    )
}

fn check_status(available: bool) -> &'static str {
    if available { "ok" } else { "unavailable" }
}

async fn bounded(check: impl Future<Output = bool>) -> bool {
    tokio::time::timeout(Duration::from_secs(3), check)
        .await
        .unwrap_or(false)
}
