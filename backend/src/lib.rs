//! LifeCycle API composition and stable public library entry points.
pub mod config;
pub mod infrastructure;
pub mod modules;
pub mod shared;

mod routes;
pub use routes::router;

// Preserve library paths used before the module reorganization.
pub use infrastructure::state;
pub use modules::{auth, habits, profile, settings, tasks, workouts};
pub use shared::{crypto, domain, errors as error, schedule};
