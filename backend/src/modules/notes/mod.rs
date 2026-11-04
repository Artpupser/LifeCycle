//! Notes module.
mod handlers;
mod models;
mod routes;
mod service;
pub(crate) use models::NoteInput;
pub use routes::routes;
pub(crate) use service::{delete_note_in, save_note_in};
