//! Settings module.
mod handlers;
mod models;
mod routes;
#[cfg(test)]
mod tests;
pub use models::{Settings, ThemeColors};
pub use routes::routes;
