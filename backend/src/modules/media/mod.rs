//! Media module.
mod handlers;
mod models;
mod routes;
mod service;
#[cfg(test)]
mod tests;
pub use routes::routes;
pub(crate) use service::ensure_owned;
