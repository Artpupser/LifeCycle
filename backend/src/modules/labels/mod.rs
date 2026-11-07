//! Labels module.
mod handlers;
mod catalog;
mod models;
mod routes;
mod service;
#[cfg(test)]
mod tests;
pub use routes::routes;
pub(crate) use service::register;
pub(crate) use service::register_with_visibility;
pub(crate) use catalog::{fixed_collection_value, collection_catalog};
mod functions;

mod tags;
