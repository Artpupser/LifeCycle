//! Ai module.
mod chats;
mod dto;
mod generation;
mod models;
mod repository;
mod requests;
mod routes;
mod service;
mod settings;
#[cfg(test)]
mod tests;
pub(crate) use models::Permissions;
pub(crate) use repository::{config, invalidate};
pub use routes::routes;
pub(crate) use service::{open, seal, stale};
pub(crate) mod access;
pub(crate) mod actions;
pub(crate) mod context;
pub(crate) mod login;
pub(crate) mod providers;
