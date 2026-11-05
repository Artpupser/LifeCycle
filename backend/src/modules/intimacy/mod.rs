//! Intimacy module.
mod handlers;
mod models;
mod routes;
mod service;
#[cfg(test)]
mod tests;
pub(crate) use models::AnalyticsSummary;
pub use routes::routes;
pub(crate) use service::{analytics_summary, analytics_summary_shared, rename_collection};
