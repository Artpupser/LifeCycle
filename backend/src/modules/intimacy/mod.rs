//! Intimacy module.
mod handlers;
mod models;
mod routes;
mod service;
#[cfg(test)]
mod tests;
pub(crate) use models::AnalyticsSummary;
pub use routes::routes;
pub(crate) use service::{analytics_summary, rename_collection};
