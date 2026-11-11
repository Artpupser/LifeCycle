mod battlenet;
mod epic;
mod handlers;
pub(crate) mod http;
mod models;
mod playstation;
mod service;
mod session;
mod steam;
#[cfg(test)]
mod tests;
mod xbox;
pub use handlers::routes;
pub(crate) use models::{Game, Snapshot, providers};
pub(crate) use service::{list, snapshots, sync_due};

#[cfg(test)]
pub(crate) use {epic::finish_for_test as test_finish_epic, models::CodeInput};
