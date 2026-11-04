use super::handlers::{
    bulk, create_folder, create_note, delete_folder, delete_note, folder, folders, note, notes,
    update_folder, update_note,
};
use crate::infrastructure::state::AppState;
use axum::{Router, routing::get};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/notes/folders", get(folders).post(create_folder))
        .route(
            "/api/notes/folders/{id}",
            get(folder).put(update_folder).delete(delete_folder),
        )
        .route("/api/notes", get(notes).post(create_note))
        .route("/api/notes/bulk", axum::routing::post(bulk))
        .route(
            "/api/notes/{id}",
            get(note).put(update_note).delete(delete_note),
        )
}
