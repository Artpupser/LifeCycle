use crate::{
    auth::CurrentUser,
    error::{ApiError, ApiJson},
    state::AppState,
    tasks,
};
use axum::{Json, Router, extract::State, routing::get};
use serde::{Deserialize, Serialize};
use sqlx::types::Json as DbJson;
use std::collections::BTreeSet;
const PAGES: [&str; 15] = [
    "/today",
    "/habits",
    "/workouts",
    "/sex",
    "/tasks",
    "/calendar",
    "/notes",
    "/countdowns",
    "/contacts",
    "/pomodoro",
    "/analytics",
    "/ai",
    "/profile",
    "/settings",
    "/status",
];
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Navigation {
    ordering: Vec<String>,
    pinned: Vec<String>,
    revision: i64,
}
impl Default for Navigation {
    fn default() -> Self {
        let ordering: Vec<_> = PAGES.iter().map(|p| (*p).to_owned()).collect();
        Self {
            pinned: ordering.clone(),
            ordering,
            revision: 0,
        }
    }
}
impl Navigation {
    fn validate(&self) -> Result<(), ApiError> {
        let ordering: BTreeSet<_> = self.ordering.iter().map(String::as_str).collect();
        let pinned: BTreeSet<_> = self.pinned.iter().map(String::as_str).collect();
        if self.revision < 0
            || self.ordering.len() != PAGES.len()
            || ordering != PAGES.into_iter().collect()
            || pinned.len() != self.pinned.len()
            || !pinned.is_subset(&ordering)
        {
            return Err(ApiError::validation(
                "Unsupported or duplicate navigation sections",
            ));
        }
        Ok(())
    }
}
pub fn routes() -> Router<AppState> {
    Router::new().route("/api/navigation", get(read).put(update))
}
async fn read(State(s): State<AppState>, u: CurrentUser) -> Result<Json<Navigation>, ApiError> {
    let value = sqlx::query_as::<_, (DbJson<Vec<String>>, DbJson<Vec<String>>, i64)>(
        "SELECT ordering,pinned,revision FROM app.navigation_preferences WHERE user_id=$1",
    )
    .bind(u.id)
    .fetch_optional(&s.database)
    .await?;
    Ok(Json(value.map_or_else(
        Navigation::default,
        |(order, pins, revision)| Navigation {
            ordering: order.0,
            pinned: pins.0,
            revision,
        },
    )))
}
async fn update(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(mut value): ApiJson<Navigation>,
) -> Result<Json<Navigation>, ApiError> {
    value.validate()?;
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    let revision = sqlx::query_scalar::<_, i64>(
        "SELECT revision FROM app.navigation_preferences WHERE user_id=$1 FOR UPDATE",
    )
    .bind(u.id)
    .fetch_optional(&mut *tx)
    .await?
    .unwrap_or(0);
    if revision != value.revision {
        return Err(crate::domain::conflict(
            "Navigation changed; refresh before retrying",
        ));
    }
    value.revision += 1;
    sqlx::query("INSERT INTO app.navigation_preferences(user_id,ordering,pinned,revision) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET ordering=EXCLUDED.ordering,pinned=EXCLUDED.pinned,revision=EXCLUDED.revision").bind(u.id).bind(DbJson(&value.ordering)).bind(DbJson(&value.pinned)).bind(value.revision).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(Json(value))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn navigation_requires_known_unique_order_and_pins() {
        let mut value = Navigation::default();
        assert!(value.validate().is_ok());
        value.pinned.clear();
        assert!(value.validate().is_ok());
        value.pinned.push("/other".into());
        assert!(value.validate().is_err());
        value = Navigation::default();
        value.ordering[1] = value.ordering[0].clone();
        assert!(value.validate().is_err());
    }
}
