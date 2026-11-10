mod cache;
mod handlers;
mod market;
mod models;
mod providers;
mod service;
#[cfg(test)]
mod tests;
pub use handlers::routes;
pub(crate) async fn background(s: crate::infrastructure::state::AppState) {
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(900));
    interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
    loop {
        interval.tick().await;
        if service::refresh(&s, false).await.is_err() {
            tracing::warn!("Game offer refresh unavailable");
        }
        if market::sales_catalog(&s, true).await.is_err() {
            tracing::warn!("Game announcements deferred");
        }
        if service::notify_subscribers(&s).await.is_err() {
            tracing::warn!("Game notifications deferred");
        }
        if crate::modules::integrations::sync_due(&s).await.is_err() {
            tracing::warn!("Integration synchronization deferred");
        }
    }
}
