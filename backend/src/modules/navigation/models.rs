use crate::shared::errors::ApiError;
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

pub(super) const PAGES: [&str; 20] = [
    "/today",
    "/habits",
    "/workouts",
    "/sex",
    "/tasks",
    "/calendar",
    "/notes",
    "/countdowns",
    "/contacts",
    "/tree",
    "/videogames",
    "/pomodoro",
    "/analytics",
    "/ai",
    "/profile",
    "/settings",
    "/status",
    "/labels",
    "/history",
    "/collections",
];

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Navigation {
    pub(super) ordering: Vec<String>,
    pub(super) pinned: Vec<String>,
    pub(super) revision: i64,
}

impl Default for Navigation {
    fn default() -> Self {
        let ordering: Vec<_> = PAGES.iter().map(|p| (*p).to_owned()).collect();
        Self {
            pinned: ordering.clone(),
            ordering,
            revision: 0,
        }
    }
}

impl Navigation {
    pub(super) fn validate(&self) -> Result<(), ApiError> {
        let ordering: BTreeSet<_> = self.ordering.iter().map(String::as_str).collect();
        let pinned: BTreeSet<_> = self.pinned.iter().map(String::as_str).collect();
        if self.revision < 0
            || self.ordering.len() != PAGES.len()
            || ordering != PAGES.into_iter().collect()
            || pinned.len() != self.pinned.len()
            || !pinned.is_subset(&ordering)
        {
            return Err(ApiError::validation(
                "Unsupported or duplicate navigation sections",
            ));
        }
        Ok(())
    }
}
