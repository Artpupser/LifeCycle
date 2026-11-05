//! Access module.
mod handlers;
mod models;
mod routes;
mod service;
pub(crate) use models::{Access, Input};
pub use routes::routes;
pub(crate) use service::{change, exercise_visible, object_table, visible};
