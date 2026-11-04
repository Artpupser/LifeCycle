//! Email-code login and session endpoints.
mod handlers;
pub use crate::shared::auth::{CurrentUser, authenticate};
pub use handlers::routes;
