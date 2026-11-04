//! Access module.
mod handlers;
mod models;
mod routes;
mod service;
pub(crate) use models::Access;
pub use routes::routes;
pub(crate) use service::{exercise_visible, visible};
