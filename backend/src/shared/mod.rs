//! Mechanisms shared by the functional modules.
pub mod auth;
pub mod crypto;
pub(crate) mod csrf;
pub mod domain;
pub mod errors;
pub mod schedule;

pub(crate) mod feedback;
