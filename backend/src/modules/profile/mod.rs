//! Profile module.
mod handlers;
mod models;
mod routes;
mod service;
#[cfg(test)]
mod tests;
pub use models::{Firsts, HabitPeriod, HarmfulHabit, Origin, Profile};
pub use routes::routes;
pub(crate) use service::load;
